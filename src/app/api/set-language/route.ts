/**
 * Set Language API
 * 
 * Allows users to manually set their preferred UI language.
 * For guests: stores in cookie
 * For logged-in users: updates database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { availableLocales, LANGUAGE_COOKIE_NAME } from '@/lib/i18n/geolocation';
import { checkRateLimit, rateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const earlySession = await getServerSession(authOptions);
        const rateLimit = checkRateLimit({
            scope: 'set-language',
            limit: 30,
            windowMs: 60_000,
            userId: earlySession?.user?.id ?? null,
            req: request,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429, headers: rateLimitHeaders(rateLimit) }
            );
        }

        const body = await request.json();
        const { language } = body;

        // Validate language code
        if (!language || !availableLocales.includes(language)) {
            return NextResponse.json(
                { error: 'Invalid language code' },
                { status: 400 }
            );
        }

        const session = earlySession;
        const userId = session?.user?.id;

        // For logged-in users, update database
        if (userId) {
            await db.user.update({
                where: { id: userId },
                data: { languageCode: language },
            });
        }

        // Always set cookie (for consistency and SSR)
        const response = NextResponse.json({
            success: true,
            language,
            stored: userId ? 'database' : 'cookie'
        });

        response.cookies.set(LANGUAGE_COOKIE_NAME, language, {
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return response;
    } catch (error) {
        console.error('Error setting language:', error);
        return NextResponse.json(
            { error: 'Failed to set language' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        availableLocales,
        defaultLocale: 'en'
    });
}
