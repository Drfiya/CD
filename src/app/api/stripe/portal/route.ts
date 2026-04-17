import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import db from '@/lib/db';
import { trackStripeEvent } from '@/lib/api-tracking';
import { checkRateLimitAsync, rateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(req: Request) {
    try {
        const stripe = getStripe();
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 10 requests per minute per user
        const rl = await checkRateLimitAsync({
            scope: 'stripe-portal',
            limit: 10,
            windowMs: 60_000,
            userId: session.user.id,
            req,
        });
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: rateLimitHeaders(rl) }
            );
        }

        // Find the user's Stripe customer ID
        const membership = await db.membership.findUnique({
            where: { userId: session.user.id },
            select: { stripeCustomerId: true },
        });

        if (!membership?.stripeCustomerId) {
            return NextResponse.json(
                { error: 'No active Stripe subscription found' },
                { status: 404 }
            );
        }

        // Create a Stripe Customer Portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: membership.stripeCustomerId,
            return_url: `${req.headers.get('origin')}/`,
        });

        // Track portal session creation
        trackStripeEvent('billing_portal.session.created');

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Stripe portal error:', error);
        return NextResponse.json(
            { error: 'Failed to create portal session' },
            { status: 500 }
        );
    }
}
