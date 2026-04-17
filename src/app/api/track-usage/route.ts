/**
 * API Usage Tracking Endpoint
 *
 * Receives tracking events from client-side code (e.g. GIPHY requests)
 * and stores them in the ApiUsage table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { trackGiphyRequest } from '@/lib/api-tracking';
import { checkRateLimit, rateLimitHeaders } from '@/lib/api/rate-limit';

interface TrackRequest {
    service: string;
    action: string;
    metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const rateLimit = checkRateLimit({
            scope: 'track-usage',
            limit: 300,
            windowMs: 60_000,
            userId: session?.user?.id ?? session?.user?.email ?? null,
            req: request,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429, headers: rateLimitHeaders(rateLimit) }
            );
        }

        const body: TrackRequest = await request.json();
        const { service, action, metadata } = body;

        if (!service || !action) {
            return NextResponse.json(
                { error: 'service and action are required' },
                { status: 400 }
            );
        }

        // Only allow known client-side services
        if (service === 'giphy') {
            trackGiphyRequest(
                action as 'trending' | 'search',
                metadata?.query as string | undefined
            );
        }

        return NextResponse.json({ tracked: true });
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
