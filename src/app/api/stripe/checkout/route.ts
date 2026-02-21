import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import db from '@/lib/db';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for subscription.
 * 
 * Supports two flows:
 * 1. New registration: receives { userId, email } — user was just created
 * 2. Existing user paywall: uses session auth to identify user
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, email } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Verify user exists
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { stripeCustomerId: true, email: true, name: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Find or create Stripe customer
        let stripeCustomerId = user.stripeCustomerId;

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: email || user.email || undefined,
                name: user.name || undefined,
                metadata: { userId },
            });
            stripeCustomerId = customer.id;

            // Store the Stripe customer ID on the user record
            await db.user.update({
                where: { id: userId },
                data: { stripeCustomerId },
            });
        }

        const priceId = process.env.STRIPE_PRICE_ID;
        if (!priceId) {
            return NextResponse.json({ error: 'Stripe Price ID not configured' }, { status: 500 });
        }

        const origin = req.headers.get('origin') || 'http://localhost:3000';

        // Create Stripe Checkout session for subscription
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/register`,
            metadata: { userId },
            subscription_data: {
                metadata: { userId },
            },
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
