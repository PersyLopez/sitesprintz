import express from 'express';
import bodyParser from 'body-parser';
import Stripe from 'stripe';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID as nodeRandomUUID } from 'crypto';
import { prisma } from '../../database/db.js';
import { sendEmail, EmailTypes } from '../utils/email-service-wrapper.js';
import {
    updateUserSubscription,
    saveOrder,
    sendOrderNotifications,
    generateOrderId
} from '../utils/stripe-helpers.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Server-side var dir for webhook persistence
const varDir = path.join(__dirname, '../../var');
const stripeEventsDir = path.join(varDir, 'stripe-events');
const stripeFailedDir = path.join(varDir, 'stripe-events-failed');

// Ensure directories exist (best-effort)
fs.mkdir(stripeEventsDir, { recursive: true }).catch(() => { });
fs.mkdir(stripeFailedDir, { recursive: true }).catch(() => { });

if (stripe && STRIPE_WEBHOOK_SECRET) {
    router.post('/stripe', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
        const signature = req.headers['stripe-signature'];
        let event;
        try {
            event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
        } catch (err) {
            return res.status(400).send(`Webhook Error: ${(err && err.message) || 'invalid signature'}`);
        }

        // Minimal handling: acknowledge and log important events
        try {
            // Deduplicate by event.id: create file with wx flag
            const filePath = path.join(stripeEventsDir, `${event.id}.json`);
            const payloadRecord = {
                id: event.id,
                type: event.type,
                account: event.account || null,
                created: event.created,
                received_at: Date.now(),
                signature: signature || null,
                raw: req.body.toString('utf8')
            };
            try {
                await fs.writeFile(filePath, JSON.stringify(payloadRecord, null, 2), { flag: 'wx' });
            } catch (e) {
                if (e && (e.code === 'EEXIST' || e.message?.includes('EEXIST'))) {
                    // Duplicate delivery; acknowledge without reprocessing
                    return res.status(200).send();
                }
                // If we cannot persist, still acknowledge to avoid webhook retries
            }

            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object;
                    console.log('Stripe event:', event.type, session.id);

                    // Handle shopping cart checkout (Pro feature)
                    if (session.metadata?.site_id && session.metadata?.order_items) {
                        try {
                            const orderItems = JSON.parse(session.metadata.order_items || '[]');
                            const orderId = nodeRandomUUID();

                            await prisma.orders.create({
                                data: {
                                    id: orderId,
                                    site_id: session.metadata.site_id,
                                    user_id: session.metadata.user_id,
                                    customer_email: session.customer_email || session.customer_details?.email,
                                    customer_name: session.customer_details?.name || 'Guest',
                                    items: JSON.stringify(orderItems),
                                    total_amount: session.amount_total / 100,
                                    stripe_session_id: session.id,
                                    status: 'completed',
                                    created_at: new Date()
                                }
                            });

                            console.log('✅ Shopping cart order created:', orderId);

                            // Send confirmation emails
                            if (session.customer_email || session.customer_details?.email) {
                                try {
                                    await sendEmail(EmailTypes.ORDER_CONFIRMATION,
                                        session.customer_email || session.customer_details.email, {
                                        orderId,
                                        items: orderItems,
                                        total: (session.amount_total / 100).toFixed(2)
                                    }
                                    );
                                } catch (e) {
                                    console.error('Failed to send order confirmation:', e);
                                }
                            }
                        } catch (error) {
                            console.error('Error processing shopping cart order:', error);
                        }
                    }

                    // Handle subscription checkout completion
                    else if (session.mode === 'subscription' && session.subscription) {
                        const customerEmail = session.customer_email || session.customer_details?.email;
                        if (customerEmail) {
                            try {
                                const subscription = await stripe.subscriptions.retrieve(session.subscription);
                                const plan = session.metadata?.plan || 'starter';
                                const priceId = subscription.items.data[0]?.price?.id;

                                await updateUserSubscription(customerEmail, {
                                    subscriptionId: subscription.id,
                                    customerId: subscription.customer,
                                    status: subscription.status,
                                    plan: plan,
                                    priceId: priceId,
                                    currentPeriodEnd: subscription.current_period_end,
                                    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                                });

                                console.log(`Subscription created for ${customerEmail}: ${plan} plan`);
                            } catch (error) {
                                console.error('Error processing subscription checkout:', error);
                            }
                        }
                    }

                    // Handle product order checkout completion
                    if (session.mode === 'payment' && session.metadata?.siteId) {
                        try {
                            const siteId = session.metadata.siteId;
                            const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });

                            // Create order object
                            const order = {
                                id: session.id,
                                orderId: generateOrderId(),
                                siteId: siteId,
                                amount: session.amount_total / 100,
                                currency: session.currency || 'usd',
                                customer: {
                                    name: session.customer_details?.name || 'Unknown',
                                    email: session.customer_details?.email || session.customer_email || '',
                                    phone: session.customer_details?.phone || null
                                },
                                items: lineItems.data.map(item => ({
                                    name: item.description,
                                    quantity: item.quantity,
                                    price: item.amount_total / 100 / item.quantity
                                })),
                                status: 'new',
                                createdAt: new Date(session.created * 1000).toISOString(),
                                stripeSessionId: session.id,
                                stripePaymentIntentId: session.payment_intent
                            };

                            // Save order
                            await saveOrder(order);
                            console.log(`Order ${order.orderId} saved for site ${siteId}`);

                            // Send email notifications
                            await sendOrderNotifications(order);
                        } catch (error) {
                            console.error('Error processing product order:', error);
                        }
                    }
                    break;
                }

                case 'customer.subscription.created':
                case 'customer.subscription.updated': {
                    const subscription = event.data.object;
                    console.log('Stripe event:', event.type, subscription.id);

                    try {
                        // Get customer email
                        const customer = await stripe.customers.retrieve(subscription.customer);
                        if (customer.email) {
                            // Determine plan from price ID
                            const priceId = subscription.items.data[0]?.price?.id;
                            let plan = 'starter';
                            if (priceId === process.env.STRIPE_PRICE_PRO) {
                                plan = 'pro';
                            }

                            await updateUserSubscription(customer.email, {
                                subscriptionId: subscription.id,
                                customerId: subscription.customer,
                                status: subscription.status,
                                plan: plan,
                                priceId: priceId,
                                currentPeriodEnd: subscription.current_period_end,
                                cancelAtPeriodEnd: subscription.cancel_at_period_end || false
                            });

                            console.log(`Subscription ${event.type === 'customer.subscription.created' ? 'created' : 'updated'} for ${customer.email}`);
                        }
                    } catch (error) {
                        console.error('Error processing subscription event:', error);
                    }
                    break;
                }

                case 'customer.subscription.deleted': {
                    const deletedSub = event.data.object;
                    console.log('Stripe event: subscription deleted', deletedSub.id);

                    try {
                        const customer = await stripe.customers.retrieve(deletedSub.customer);
                        if (customer.email) {
                            await updateUserSubscription(customer.email, {
                                status: 'cancelled',
                                cancelledAt: Date.now()
                            });
                            console.log(`Subscription cancelled for ${customer.email}`);
                        }
                    } catch (error) {
                        console.error('Error processing subscription cancellation:', error);
                    }
                    break;
                }

                case 'payment_intent.succeeded':
                case 'charge.refunded':
                case 'payment_intent.payment_failed':
                    console.log('Stripe event:', event.type, event.data?.object?.id || '');
                    break;

                default:
                    break;
            }
        } catch (err) {
            try {
                const failedPath = path.join(stripeFailedDir, `${event.id}-${Date.now()}.json`);
                await fs.writeFile(failedPath, JSON.stringify({ error: String(err?.message || err), event }, null, 2));
            } catch (_) { /* ignore */ }
            // Never block webhook on internal errors – acknowledge and alert separately if needed
        }
        return res.status(200).send();
    });
}

export default router;
