/**
 * API Usage Tracking Endpoint
 *
 * Receives tracking events from client-side code (e.g. GIPHY requests)
 * and stores them in the ApiUsage table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { trackGiphyRequest } from '@/lib/api-tracking';

interface TrackRequest {
    service: string;
    action: string;
    metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
    try {
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
