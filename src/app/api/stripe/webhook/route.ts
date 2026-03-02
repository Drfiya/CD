import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStripe } from '@/lib/stripe';
import db from '@/lib/db';
import type Stripe from 'stripe';
import { trackStripeEvent } from '@/lib/api-tracking';

// Disable body parsing — Stripe needs the raw body for signature verification
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const stripe = getStripe();
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            // In development without webhook secret, parse without verification
            console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
            event = JSON.parse(body) as Stripe.Event;
        } else {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        }
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
                break;

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                // Unhandled event type — safe to ignore
                break;
        }
    } catch (err) {
        console.error(`Error handling event ${event.type}:`, err);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

    // Track the webhook event
    trackStripeEvent(event.type);

    return NextResponse.json({ received: true });
}

// --- Event Handlers ---

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    if (!userId) {
        console.error('No userId in checkout session metadata');
        return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    // Retrieve the subscription to get the price ID
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;

    // Upsert membership — handles both new registrations and resubscriptions
    await db.membership.upsert({
        where: { userId },
        create: {
            userId,
            status: 'ACTIVE',
            planName: 'Community Membership',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            paidAt: new Date(),
        },
        update: {
            status: 'ACTIVE',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            paidAt: new Date(),
        },
    });

    console.log(`Membership activated for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const membership = await db.membership.findUnique({
        where: { stripeSubscriptionId: subscription.id },
    });

    if (!membership) return;

    // Map Stripe subscription status to our membership status
    const statusMap: Record<string, 'ACTIVE' | 'EXPIRED' | 'CANCELLED'> = {
        active: 'ACTIVE',
        past_due: 'ACTIVE', // Still active, but payment is overdue
        canceled: 'CANCELLED',
        unpaid: 'EXPIRED',
        incomplete_expired: 'EXPIRED',
    };

    const newStatus = statusMap[subscription.status] ?? 'ACTIVE';

    await db.membership.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
            status: newStatus,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            expiresAt: (subscription as any).current_period_end
                ? new Date((subscription as any).current_period_end * 1000)
                : null,
        },
    });

    console.log(`Membership ${membership.id} updated to ${newStatus}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const membership = await db.membership.findUnique({
        where: { stripeSubscriptionId: subscription.id },
    });

    if (!membership) return;

    await db.membership.update({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'CANCELLED' },
    });

    console.log(`Membership ${membership.id} cancelled`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionId = (invoice as any).subscription as string;
    if (!subscriptionId) return;

    const membership = await db.membership.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
    });

    if (!membership) return;

    await db.membership.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: 'EXPIRED' },
    });

    console.log(`Membership ${membership.id} expired due to payment failure`);
}
