import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../../database/db.js';
import { sendEmail } from './email-service-wrapper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '../../public');
const ordersDir = path.join(publicDir, 'data', 'orders');

// Ensure orders directory exists
fs.mkdir(ordersDir, { recursive: true }).catch(() => { });

export function generateOrderId() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}${random}`;
}

export async function saveOrder(order) {
    try {
        const siteOrdersDir = path.join(ordersDir, order.siteId);
        await fs.mkdir(siteOrdersDir, { recursive: true });

        const ordersFile = path.join(siteOrdersDir, 'orders.json');

        // Load existing orders
        let orders = { orders: [] };
        try {
            const content = await fs.readFile(ordersFile, 'utf-8');
            orders = JSON.parse(content);
        } catch (err) {
            // File doesn't exist yet, start with empty array
        }

        // Add new order to beginning of array
        orders.orders.unshift(order);

        // Save back to file
        await fs.writeFile(ordersFile, JSON.stringify(orders, null, 2));

        return true;
    } catch (error) {
        console.error('Error saving order:', error);
        return false;
    }
}

export async function loadOrders(siteId) {
    try {
        const ordersFile = path.join(ordersDir, siteId, 'orders.json');
        const content = await fs.readFile(ordersFile, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return { orders: [] };
    }
}

export async function sendOrderNotifications(order) {
    try {
        // Load site data to get business name and notification email
        // Try DB first, fall back to file
        let site = null;
        try {
            site = await prisma.sites.findUnique({
                where: { id: order.siteId },
                select: { site_data: true }
            });
        } catch (e) {
            console.warn('Could not load site from DB:', e);
        }

        let siteData = { name: 'Your Business', notificationEmail: null, ownerEmail: null };

        if (site && site.site_data) {
            siteData = typeof site.site_data === 'string'
                ? JSON.parse(site.site_data)
                : site.site_data;
        } else {
            // Fallback to file
            const siteFile = path.join(publicDir, 'sites', order.siteId, 'site.json');
            try {
                const siteContent = await fs.readFile(siteFile, 'utf-8');
                siteData = JSON.parse(siteContent);
            } catch (err) {
                console.error('Could not load site data for email:', err);
            }
        }

        const businessName = siteData.name || siteData.businessName || 'Your Business';

        // Send confirmation email to customer
        if (order.customer.email) {
            await sendEmail(
                order.customer.email,
                'orderConfirmation',
                {
                    customerName: order.customer.name,
                    orderId: order.orderId,
                    items: order.items,
                    total: order.amount,
                    currency: order.currency,
                    businessName: businessName
                }
            );
            console.log(`✅ Order confirmation sent to customer: ${order.customer.email}`);
        }

        // Send alert email to business owner (use notificationEmail if set, fallback to ownerEmail)
        const notificationEmail = siteData.notificationEmail || siteData.ownerEmail;
        if (notificationEmail) {
            await sendEmail(
                notificationEmail,
                'newOrderAlert',
                {
                    businessName: businessName,
                    orderId: order.orderId,
                    customerName: order.customer.name,
                    customerEmail: order.customer.email,
                    customerPhone: order.customer.phone,
                    items: order.items,
                    total: order.amount,
                    currency: order.currency,
                    siteId: order.siteId
                }
            );
            console.log(`✅ Order alert sent to: ${notificationEmail}`);
        } else {
            console.log(`⚠️ No notification email configured for site ${order.siteId}`);
        }
    } catch (error) {
        console.error('Error sending order notifications:', error);
    }
}

export async function updateUserSubscription(email, subscriptionData) {
    try {
        // Update user in DB
        await prisma.users.update({
            where: { email: email.toLowerCase() },
            data: {
                subscription_status: subscriptionData.status,
                plan: subscriptionData.plan,
                stripe_customer_id: subscriptionData.customerId,
                stripe_subscription_id: subscriptionData.subscriptionId,
                current_period_end: subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd * 1000) : null,
                cancel_at_period_end: subscriptionData.cancelAtPeriodEnd
            }
        });
        console.log(`Updated subscription for ${email} in DB:`, subscriptionData);
    } catch (error) {
        console.error('Failed to update user subscription in DB:', error);
        // Don't throw, just log, to avoid breaking webhook flow if user not found
    }
}
