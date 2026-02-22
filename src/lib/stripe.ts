import Stripe from 'stripe';

/**
 * Lazy-initialized Stripe singleton.
 * Deferred to avoid crashing during Next.js build (page data collection phase),
 * where env vars may not yet be available.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
            typescript: true,
        });
    }
    return _stripe;
}
