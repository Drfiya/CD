/**
 * Translation API Route
 *
 * Server-side proxy for Azure Translator API requests.
 * This hides the API key from the client and allows for server-side caching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateBatch } from '@/lib/translation/providers/azure';

// Rate limiting: Track requests per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function getRateLimitInfo(ip: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
        return { allowed: true, remaining: RATE_LIMIT - 1 };
    }

    if (record.count >= RATE_LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: RATE_LIMIT - record.count };
}

interface TranslateRequest {
    texts: string[];
    targetLang: string;
    sourceLang?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Get client IP for rate limiting
        const ip = request.headers.get('x-forwarded-for')
            || request.headers.get('x-real-ip')
            || 'unknown';

        const rateLimit = getRateLimitInfo(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'Retry-After': '60',
                    }
                }
            );
        }

        const body: TranslateRequest = await request.json();
        const { texts, targetLang, sourceLang } = body;

        // Validate request
        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return NextResponse.json(
                { error: 'texts must be a non-empty array of strings' },
                { status: 400 }
            );
        }

        if (!targetLang || typeof targetLang !== 'string') {
            return NextResponse.json(
                { error: 'targetLang is required and must be a string' },
                { status: 400 }
            );
        }

        // Limit batch size to prevent abuse
        if (texts.length > 100) {
            return NextResponse.json(
                { error: 'Maximum 100 texts per request' },
                { status: 400 }
            );
        }

        // Normalize language codes
        const normalizedTarget = targetLang.toLowerCase().split('-')[0];
        const normalizedSource = sourceLang?.toLowerCase().split('-')[0];

        // Skip translation if source matches target
        if (normalizedSource && normalizedTarget === normalizedSource) {
            return NextResponse.json({
                translations: texts,
                skipped: true,
                message: 'Source and target languages match; returning original text',
            });
        }

        // Call Azure batch translation
        const translations = await translateBatch(texts, normalizedSource, normalizedTarget);

        return NextResponse.json(
            {
                translations,
                targetLang: normalizedTarget,
                sourceLang: normalizedSource,
            },
            {
                headers: {
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                }
            }
        );

    } catch (error) {
        console.error('Translation API error:', error);

        // Return original texts on error to avoid breaking the UI
        const body = await request.clone().json().catch(() => ({ texts: [] }));

        return NextResponse.json(
            {
                error: 'Translation service temporarily unavailable',
                translations: body.texts || [],
                fallback: true,
            },
            { status: 500 }
        );
    }
}

// Health check endpoint
export async function GET() {
    const apiKeyConfigured = !!process.env.AZURE_TRANSLATOR_KEY;

    return NextResponse.json({
        status: apiKeyConfigured ? 'healthy' : 'misconfigured',
        provider: 'azure',
        message: apiKeyConfigured
            ? 'Azure Translator service is ready'
            : 'AZURE_TRANSLATOR_KEY is not configured',
    });
}
