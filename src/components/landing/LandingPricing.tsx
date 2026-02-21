'use client';

import Link from 'next/link';

interface LandingPricingProps {
    priceUsd: number;
    priceEur: number;
    isEurope: boolean;
    ctaText: string;
}

export function LandingPricing({ priceUsd, priceEur, isEurope, ctaText }: LandingPricingProps) {
    const price = isEurope ? priceEur : priceUsd;
    const currency = isEurope ? '€' : '$';
    const period = isEurope ? '/Monat' : '/month';

    return (
        <div className="landing-pricing-card">
            <div className="landing-pricing-badge">Membership</div>
            <div className="landing-pricing-amount">
                <span className="landing-pricing-currency">{currency}</span>
                <span className="landing-pricing-value">{price}</span>
                <span className="landing-pricing-period">{period}</span>
            </div>
            <Link href="/register" className="landing-pricing-cta">
                {ctaText}
            </Link>
        </div>
    );
}
