/**
 * Generic API Usage Tracking
 *
 * Fire-and-forget helper to track API calls across all services.
 * Writes to the `ApiUsage` table for the Command Center dashboard.
 */

import db from '@/lib/db';

export type ApiService = 'deepl' | 'gemini' | 'resend' | 'stripe' | 'giphy' | 'supabase';

export interface TrackApiCallParams {
    service: ApiService;
    action: string;
    units?: number;
    unitType: string;
    cost?: number;
    metadata?: Record<string, unknown>;
}

/**
 * Track an API call. Non-blocking, fire-and-forget.
 * Errors are silently caught to never break the calling code.
 */
export function trackApiCall(params: TrackApiCallParams): void {
    const { service, action, units = 1, unitType, cost = 0, metadata } = params;

    // Don't await — fire and forget
    db.apiUsage.create({
        data: {
            service,
            action,
            units,
            unitType,
            cost,
            metadata: metadata ?? undefined,
        },
    }).catch((err) => {
        console.error(`[api-tracking] Failed to track ${service}/${action}:`, err);
    });
}

// --- Service-specific convenience functions ---

/** Track a Resend email send */
export function trackResendEmail(recipient: string): void {
    trackApiCall({
        service: 'resend',
        action: 'send_email',
        units: 1,
        unitType: 'emails',
        cost: 0, // Free tier
        metadata: { to: recipient },
    });
}

/** Track a Stripe API interaction */
export function trackStripeEvent(eventType: string): void {
    trackApiCall({
        service: 'stripe',
        action: eventType,
        units: 1,
        unitType: 'requests',
        cost: 0, // Stripe costs are % of revenue
    });
}

/** Track a GIPHY API request */
export function trackGiphyRequest(action: 'trending' | 'search', query?: string): void {
    trackApiCall({
        service: 'giphy',
        action,
        units: 1,
        unitType: 'requests',
        cost: 0, // Free API
        metadata: query ? { query } : undefined,
    });
}

/** Track a Gemini AI report generation */
export function trackGeminiReport(estimatedTokens: number = 2000): void {
    // Gemini 2.0 Flash: ~$0.10/1M input + $0.40/1M output
    // Conservative estimate: ~$0.001 per report
    const cost = (estimatedTokens / 1_000_000) * 0.50;
    trackApiCall({
        service: 'gemini',
        action: 'generate_report',
        units: estimatedTokens,
        unitType: 'tokens',
        cost,
    });
}
