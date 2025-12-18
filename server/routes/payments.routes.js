import express from 'express';
import Stripe from 'stripe';
import { randomUUID as nodeRandomUUID } from 'crypto';
import { prisma } from '../../database/db.js';
import { authenticateToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Stripe setup
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' }) : null;

// Allowed origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

function getRequestOrigin(req) {
    const hdrOrigin = req.headers['origin'];
    if (typeof hdrOrigin === 'string' && hdrOrigin) return hdrOrigin;
    const ref = req.headers['referer'];
    if (typeof ref === 'string' && ref) {
        try { const u = new URL(ref); return `${u.protocol}//${u.host}`; } catch (_) { /* ignore */ }
    }
    return '';
}

function isAllowedOrigin(req) {
    if (process.env.NODE_ENV === 'test') return true;
    const origin = getRequestOrigin(req);
    console.log(`[AUTH] Origin check: Origin=${origin}`);
    if (!origin) return true; // Non-browser clients; allow
    const sameOrigin = `${req.protocol}://${req.get('host')}`;
    console.log(`[AUTH] Origin check: SameOrigin=${sameOrigin}`);
    const allowed = [sameOrigin, ...ALLOWED_ORIGINS];
    console.log(`[AUTH] Origin check: Allowed=[${allowed.join(', ')}]`);
    const isAllowed = allowed.some(o => o && o.toLowerCase() === origin.toLowerCase());
    console.log(`[AUTH] Origin check: Result=${isAllowed}`);
    return isAllowed;
}

// Payments config – expose if payments are enabled
router.get('/payments/config', (req, res) => {
    res.json({
        hasStripe: Boolean(stripe),
        publishableKey: STRIPE_PUBLISHABLE_KEY || undefined
    });
});

// Create Checkout Session for Shopping Cart (Pro Feature)
router.post('/checkout/create-session', authenticateToken, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(503).json({ message: 'Stripe not configured' });
        }

        const { items, siteId, successUrl, cancelUrl } = req.body;

        // Validate inputs
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items are required' });
        }

        if (!siteId) {
            return res.status(400).json({ message: 'Site ID is required' });
        }

        // Verify site belongs to user
        // Using user_id as consistent with other routes
        const site = await prisma.sites.findFirst({
            where: {
                id: siteId,
                user_id: req.user.id
            }
        });

        if (!site) {
            return res.status(404).json({ message: 'Site not found' });
        }

        const stripeAccountId = site.stripe_account_id;

        // Build line items for Stripe
        const lineItems = items.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    description: item.description || '',
                    images: item.image ? [item.image] : [],
                    metadata: {
                        product_id: item.id,
                        options: JSON.stringify(item.options || {})
                    }
                },
                unit_amount: Math.round(item.price * 100), // Convert to cents
            },
            quantity: item.quantity || 1,
        }));

        // Calculate platform fee (10% commission)
        const total = items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        const platformFee = Math.round(total * 100 * 0.10); // 10% in cents

        // Create Stripe session
        const sessionParams = {
            payment_method_types: ['card', 'paypal', 'link'], // Multiple payment methods
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: siteId,
            metadata: {
                site_id: siteId,
                user_id: req.user.id,
                order_items: JSON.stringify(items)
            },
            billing_address_collection: 'auto',
            // Enable Stripe Connect if site has connected account
            ...(stripeAccountId && {
                payment_intent_data: {
                    application_fee_amount: platformFee,
                    transfer_data: {
                        destination: stripeAccountId,
                    },
                },
            }),
        };

        const session = await stripe.checkout.sessions.create(sessionParams);

        console.log('✅ Checkout session created:', session.id, 'for user:', req.user.email);

        res.json({
            id: session.id,
            url: session.url
        });

    } catch (error) {
        console.error('Checkout session creation error:', error);
        res.status(500).json({
            message: 'Failed to create checkout session',
            error: error.message
        });
    }
});

// Create a Checkout Session for a product with dynamic pricing and Stripe Connect support
router.post('/payments/checkout-sessions', async (req, res) => {
    try {
        if (!stripe) return res.status(503).json({ error: 'Payments not configured' });

        if (!isAllowedOrigin(req)) {
            return res.status(403).json({ error: 'Origin not allowed' });
        }

        const { productIndex, quantity, currency, successUrl, cancelUrl, siteId } = req.body || {};
        const idx = Number(productIndex);
        if (!Number.isInteger(idx) || idx < 0) {
            return res.status(400).json({ error: 'Invalid productIndex' });
        }

        // Load site data from database
        if (!siteId) {
            return res.status(400).json({ error: 'siteId is required' });
        }

        let siteData = null;
        let siteOwner = null;

        try {
            const site = await prisma.sites.findUnique({
                where: { id: siteId },
                include: { users: true }
            });
            if (site) {
                siteData = typeof site.site_data === 'string' ? JSON.parse(site.site_data) : site.site_data;
                siteOwner = site.users;
            }
        } catch (err) {
            console.error(`[Payments] Failed to find site by ID '${siteId}':`, err.message);
            return res.status(500).json({ error: 'Failed to load site data' });
        }

        if (!siteData) {
            return res.status(404).json({ error: 'Site not found' });
        }

        const products = Array.isArray(siteData.products) ? siteData.products : [];
        const product = products[idx];

        if (!product || typeof product.price !== 'number' || !product.name) {
            return res.status(400).json({ error: 'Product not found' });
        }

        const allowCheckout = siteData.settings?.allowCheckout !== false;
        if (!allowCheckout) {
            return res.status(403).json({ error: 'Checkout disabled for this site' });
        }

        const unitAmountCents = Math.round(product.price * 100);
        if (unitAmountCents < 50) {
            return res.status(400).json({ error: 'Amount too low' });
        }

        const qty = Math.max(1, Number(quantity) || 1);
        const curr = (currency || 'usd').toLowerCase();

        // Determine return URLs
        const origin = `${req.protocol}://${req.get('host')}`;
        let success, cancel;
        if (siteId) {
            success = successUrl || `${origin}/sites/${siteId}/?order=success`;
            cancel = cancelUrl || `${origin}/sites/${siteId}/?order=cancelled`;
        } else {
            success = successUrl || `${origin}/?checkout=success`;
            cancel = cancelUrl || `${origin}/?checkout=cancel`;
        }

        // Check if site owner has Stripe Connect configured
        let stripeAccountId = null;
        if (siteOwner && siteOwner.stripe_account_id && siteOwner.stripe_connected) {
            stripeAccountId = siteOwner.stripe_account_id;
        } else if (siteData.ownerEmail) {
            // Fallback to file-based user lookup if not found via relation
            const user = await prisma.users.findUnique({
                where: { email: siteData.ownerEmail }
            });
            if (user && user.stripe_account_id && user.stripe_connected) {
                stripeAccountId = user.stripe_account_id;
            }
        }

        // Idempotency key
        const incomingIdem = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey);
        const idempotencyKey = typeof incomingIdem === 'string' && incomingIdem
            ? incomingIdem
            : (typeof nodeRandomUUID === 'function' ? nodeRandomUUID() : `${Date.now()}-${Math.random()}`);

        // Create session - use Connect account if available
        const sessionOptions = {
            mode: 'payment',
            line_items: [
                {
                    quantity: qty,
                    price_data: {
                        currency: curr,
                        unit_amount: unitAmountCents,
                        product_data: {
                            name: String(product.name).slice(0, 250),
                            description: product.description ? String(product.description).slice(0, 500) : undefined
                        }
                    }
                }
            ],
            success_url: success,
            cancel_url: cancel,
            allow_promotion_codes: false,
            automatic_tax: { enabled: false }, // Disabled for test/demo mode to avoid origin configuration errors
            metadata: {
                siteId: siteId ? String(siteId) : '',
                productIndex: String(idx)
            }
        };

        const createOptions = { idempotencyKey };

        // If connected account exists, use it
        if (stripeAccountId) {
            createOptions.stripeAccount = stripeAccountId;
            console.log(`Creating checkout on connected account: ${stripeAccountId}`);
        }

        const session = await stripe.checkout.sessions.create(sessionOptions, createOptions);

        return res.json({ url: session.url });
    } catch (err) {
        console.error('Failed to create checkout session', err);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Create Checkout Session for subscription (Starter/Pro plans)
async function createSubscriptionCheckout(req, res) {
    try {
        if (!stripe) {
            return res.status(503).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to .env' });
        }

        const { plan, draftId } = req.body;
        const userEmail = req.user.email;

        // Validate plan and get pricing details
        const validPlans = ['starter', 'pro'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan. Must be "starter" or "pro"' });
        }

        // Define plan details (dynamic pricing - no need for pre-created products!)
        const planDetails = {
            starter: {
                name: 'SiteSprintz Starter',
                amount: 1000, // $10.00 in cents
                description: 'Professional website with all premium features'
            },
            pro: {
                name: 'SiteSprintz Pro',
                amount: 2500, // $25.00 in cents
                description: 'Pro plan with payments, ecommerce, and advanced features'
            }
        };

        const selectedPlan = planDetails[plan];

        // Create or retrieve Stripe customer
        let customer;
        const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

        if (existingCustomers.data.length > 0) {
            customer = existingCustomers.data[0];
        } else {
            customer = await stripe.customers.create({
                email: userEmail,
                metadata: {
                    source: 'sitesprintz',
                    signupDate: new Date().toISOString()
                }
            });
        }

        // Create checkout session with dynamic pricing
        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            mode: 'subscription',
            payment_method_types: ['card', 'paypal', 'link'], // Multiple payment methods
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: selectedPlan.name,
                        description: selectedPlan.description,
                    },
                    unit_amount: selectedPlan.amount,
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            }],
            success_url: `${process.env.SITE_URL || 'http://localhost:3000'}/payment-success.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
            cancel_url: `${process.env.SITE_URL || 'http://localhost:3000'}/payment-cancel.html?plan=${plan}`,
            allow_promotion_codes: true,
            billing_address_collection: 'auto',
            // Enable Apple Pay and Google Pay automatically for supported devices
            automatic_tax: { enabled: false }, // Set to true if you have tax calculation enabled
            metadata: {
                plan,
                user_email: userEmail,
                draft_id: draftId || '',
                source: 'sitesprintz_subscription'
            }
        });

        console.log(`Created subscription checkout session for ${userEmail}, plan: ${plan}, session: ${session.id}`);
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error('Subscription checkout error:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            message: error.message
        });
    }
}

router.post('/payments/create-subscription-checkout', requireAuth, createSubscriptionCheckout);
router.post('/create-subscription-checkout', requireAuth, createSubscriptionCheckout);

// Get user's subscription status
router.get('/subscription/status', requireAuth, async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Load user data from DB
        const user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            return res.json({ hasSubscription: false, plan: 'free' });
        }

        // Check if user has subscription data
        if (!user.stripe_subscription_id) {
            return res.json({ hasSubscription: false, plan: 'free' });
        }

        // Verify subscription status with Stripe
        if (stripe && user.stripe_subscription_id) {
            try {
                const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

                // Update local data if different
                if (subscription.status !== user.subscription_status) {
                    await prisma.users.update({
                        where: { email: userEmail },
                        data: { subscription_status: subscription.status }
                    });
                }

                return res.json({
                    hasSubscription: subscription.status === 'active' || subscription.status === 'trialing',
                    plan: user.plan || 'free',
                    status: subscription.status,
                    currentPeriodEnd: subscription.current_period_end,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end
                });
            } catch (error) {
                console.error('Error fetching subscription from Stripe:', error);
            }
        }

        // Fallback to local data
        res.json({
            hasSubscription: user.subscription_status === 'active',
            plan: user.plan || 'free',
            status: user.subscription_status
        });
    } catch (error) {
        console.error('Subscription status error:', error);
        res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
});

// ==================== STRIPE CONNECT ROUTES ====================

// Initiate Stripe Connect onboarding
router.post('/connect/onboard', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const userEmail = req.user.email;

        // Check if user has Pro or Premium subscription
        const user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify user has Pro or Premium subscription
        const plan = user.plan?.toLowerCase();
        if (plan !== 'pro' && plan !== 'premium') {
            return res.status(403).json({
                error: 'Stripe Connect requires Pro or Premium subscription',
                currentPlan: plan || 'free'
            });
        }

        // Check if user already has a connected account
        let accountId = user.stripe_account_id;

        if (!accountId) {
            // Create a new Stripe Connect account
            const account = await stripe.accounts.create({
                type: 'standard',
                email: userEmail,
                business_type: 'individual',
                metadata: {
                    platform_user_email: userEmail,
                    created_via: 'sitesprintz_platform'
                }
            });

            accountId = account.id;

            // Save account ID to user data
            await prisma.users.update({
                where: { email: userEmail },
                data: {
                    stripe_account_id: accountId,
                    stripe_connected: false // Pending
                }
            });

            console.log(`Created Connect account ${accountId} for ${userEmail}`);
        }

        // Create Account Link for onboarding
        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${origin}/dashboard.html?connect=refresh`,
            return_url: `${origin}/dashboard.html?connect=success`,
            type: 'account_onboarding',
        });

        res.json({
            url: accountLink.url,
            accountId
        });

    } catch (error) {
        console.error('Connect onboarding error:', error);
        res.status(500).json({
            error: 'Failed to initiate Connect onboarding',
            message: error.message
        });
    }
});

// Get Stripe Connect status
router.get('/connect/status', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.json({ connected: false, message: 'Stripe not configured' });
        }

        const userEmail = req.user.email;
        const user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user || !user.stripe_account_id) {
            return res.json({ connected: false });
        }

        // Verify account status with Stripe
        try {
            const account = await stripe.accounts.retrieve(user.stripe_account_id);

            const isConnected = account.charges_enabled && account.payouts_enabled;

            // Update local status if changed
            if (user.stripe_connected !== isConnected) {
                await prisma.users.update({
                    where: { email: userEmail },
                    data: { stripe_connected: isConnected }
                });
            }

            res.json({
                connected: isConnected,
                accountId: account.id,
                status: isConnected ? 'active' : 'pending',
                chargesEnabled: account.charges_enabled,
                payoutsEnabled: account.payouts_enabled,
                detailsSubmitted: account.details_submitted,
                email: account.email,
                businessProfile: {
                    name: account.business_profile?.name,
                    url: account.business_profile?.url
                }
            });

        } catch (error) {
            console.error('Failed to retrieve Connect account:', error);
            res.json({
                connected: false,
                error: 'Failed to verify account status',
                accountId: user.stripe_account_id
            });
        }

    } catch (error) {
        console.error('Connect status error:', error);
        res.status(500).json({ error: 'Failed to fetch Connect status' });
    }
});

// Refresh Connect account link (if onboarding incomplete)
router.post('/connect/refresh', requireAuth, async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const userEmail = req.user.email;
        const user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.stripe_account_id) {
            return res.status(400).json({ error: 'No Connect account found. Please start onboarding first.' });
        }

        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;
        const accountLink = await stripe.accountLinks.create({
            account: user.stripe_account_id,
            refresh_url: `${origin}/dashboard.html?connect=refresh`,
            return_url: `${origin}/dashboard.html?connect=success`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });

    } catch (error) {
        console.error('Connect refresh error:', error);
        res.status(500).json({
            error: 'Failed to refresh Connect link',
            message: error.message
        });
    }
});

// Disconnect Stripe Connect account
router.post('/connect/disconnect', requireAuth, async (req, res) => {
    try {
        const userEmail = req.user.email;
        const user = await prisma.users.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.stripe_account_id) {
            // Note: We don't delete the Stripe account, just disconnect it from our platform
            // The business owner can delete it themselves from their Stripe dashboard
            await prisma.users.update({
                where: { email: userEmail },
                data: {
                    stripe_connected: false,
                    // We might want to keep stripe_account_id for reference or clear it?
                    // Keeping it allows reconnection to same account easily.
                    // But if they want to disconnect fully, maybe we should clear it?
                    // The original code kept it but set status to 'disconnected'.
                    // I'll keep it but set stripe_connected to false.
                }
            });
            console.log(`Disconnected Connect account for ${userEmail}`);
        }

        res.json({ success: true, message: 'Account disconnected' });

    } catch (error) {
        console.error('Connect disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect account' });
    }
});

// Create checkout session with connected account (for customer purchases)
router.post('/connect/create-checkout', async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Stripe not configured' });
        }

        const { connectedAccountId, lineItems, metadata } = req.body;

        if (!connectedAccountId) {
            return res.status(400).json({ error: 'Connected account ID required' });
        }

        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
            return res.status(400).json({ error: 'Line items required' });
        }

        // Verify the connected account exists and is active
        const account = await stripe.accounts.retrieve(connectedAccountId);
        if (!account.charges_enabled) {
            return res.status(400).json({ error: 'Connected account cannot accept charges' });
        }

        // Calculate platform fee (1% of total, min $0.50, max $5.00)
        const total = lineItems.reduce((sum, item) => {
            return sum + (item.price_data.unit_amount * item.quantity);
        }, 0);
        const platformFee = Math.min(Math.max(Math.round(total * 0.01), 50), 500);

        const origin = req.headers.origin || `${req.protocol}://${req.get('host')}`;

        // Create checkout session on behalf of connected account
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items: lineItems,
            success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/cancel.html`,
            payment_intent_data: {
                application_fee_amount: platformFee,
                metadata: {
                    ...metadata,
                    platform: 'sitesprintz'
                }
            },
            metadata: {
                ...metadata,
                connectedAccountId
            }
        }, {
            stripeAccount: connectedAccountId // Create on behalf of connected account
        });

        console.log(`Created Connect checkout session ${session.id} for account ${connectedAccountId}`);
        console.log(`Platform fee: $${(platformFee / 100).toFixed(2)}`);

        res.json({
            sessionId: session.id,
            url: session.url,
            platformFee: platformFee / 100
        });

    } catch (error) {
        console.error('Connect checkout error:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            message: error.message
        });
    }
});

export default router;
