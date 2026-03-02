import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import db from '@/lib/db';
import type Stripe from 'stripe';
import { trackStripeEvent } from '@/lib/api-tracking';

/**
 * Resolve a customer-facing promo code string (e.g. "ALPHA100") to a Stripe
 * promotion_code ID. Returns null if the code is missing, invalid, or inactive.
 */
async function resolvePromoCode(
    stripe: Stripe,
    code: string | undefined
): Promise<string | null> {
    if (!code || typeof code !== 'string') return null;

    try {
        const result = await stripe.promotionCodes.list({
            code: code.trim(),
            active: true,
            limit: 1,
        });
        return result.data[0]?.id ?? null;
    } catch {
        console.warn(`Failed to resolve promo code "${code}"`);
        return null;
    }
}

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout Session for subscription.
 *
 * Supports two flows:
 * 1. New registration: receives { userId, email } — user was just created
 * 2. Existing user paywall: uses session auth to identify user
 *
 * Optional: pass { promoCode: "ALPHA100" } to pre-apply a discount server-side.
 */
export async function POST(req: Request) {
    try {
        const stripe = getStripe();
        const body = await req.json();
        const { userId, email, promoCode } = body;

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

        // If a promo code was provided, resolve it server-side.
        // This bypasses Stripe Checkout UI restrictions (e.g. 100% off codes).
        const resolvedPromoId = await resolvePromoCode(stripe, promoCode);

        // Build checkout session params
        const params: Stripe.Checkout.SessionCreateParams = {
            customer: stripeCustomerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/registration-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/register`,
            metadata: { userId },
            subscription_data: {
                metadata: { userId },
            },
        };

        if (resolvedPromoId) {
            // Apply the resolved promo code server-side
            params.discounts = [{ promotion_code: resolvedPromoId }];
        } else {
            // No pre-applied code — let users enter one manually at checkout
            params.allow_promotion_codes = true;
        }

        const checkoutSession = await stripe.checkout.sessions.create(params);

        // Track checkout session creation
        trackStripeEvent('checkout.session.created');

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
