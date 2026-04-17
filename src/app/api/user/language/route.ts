/**
 * User Language Preference API Route
 * 
 * Allows users to update their language preference in their profile.
 * This is called by the TranslationContext when the language changes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { checkRateLimit, rateLimitHeaders } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            // Not logged in - that's fine, just return success
            // Language is still saved to localStorage on the client
            return NextResponse.json({ success: true, saved: false });
        }

        const rateLimit = checkRateLimit({
            scope: 'user-language',
            limit: 30,
            windowMs: 60_000,
            userId: session.user.id,
            req: request,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429, headers: rateLimitHeaders(rateLimit) }
            );
        }

        const body = await request.json();
        const { languageCode } = body;

        if (!languageCode || typeof languageCode !== 'string') {
            return NextResponse.json(
                { error: 'languageCode is required' },
                { status: 400 }
            );
        }

        // Validate language code (2-3 chars)
        if (!/^[a-z]{2,3}$/i.test(languageCode)) {
            return NextResponse.json(
                { error: 'Invalid language code format' },
                { status: 400 }
            );
        }

        // Update user's language preference
        await db.user.update({
            where: { id: session.user.id },
            data: { languageCode: languageCode.toLowerCase() },
        });

        return NextResponse.json({ success: true, saved: true });
    } catch (error) {
        console.error('Error updating user language:', error);
        return NextResponse.json(
            { error: 'Failed to update language preference' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ languageCode: null });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { languageCode: true },
        });

        return NextResponse.json({ languageCode: user?.languageCode || 'en' });
    } catch (error) {
        console.error('Error getting user language:', error);
        return NextResponse.json({ languageCode: 'en' });
    }
}
