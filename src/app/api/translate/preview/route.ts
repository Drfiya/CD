/**
 * Translation Preview API Route
 *
 * Allows users to preview how their post will look in another language
 * before publishing. Uses the same DeepL translation pipeline.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { translateForPreview, detectLanguage } from '@/lib/translation';

interface PreviewRequest {
    text: string;
    title?: string;
    targetLang: string;
    sourceLang?: string;
}

export async function POST(request: NextRequest) {
    try {
        // Require authentication for preview
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const body: PreviewRequest = await request.json();
        const { text, title, targetLang, sourceLang } = body;

        if (!text || !targetLang) {
            return NextResponse.json(
                { error: 'text and targetLang are required' },
                { status: 400 }
            );
        }

        // Limit text length for preview
        if (text.length > 10000) {
            return NextResponse.json(
                { error: 'Text too long for preview (max 10,000 characters)' },
                { status: 400 }
            );
        }

        // Auto-detect source language if not provided
        const detectedSourceLang = sourceLang || await detectLanguage(text);

        // Skip if same language
        if (detectedSourceLang === targetLang) {
            return NextResponse.json({
                translatedText: text,
                translatedTitle: title || null,
                sourceLang: detectedSourceLang,
                targetLang,
                sameLanguage: true,
            });
        }

        // Translate text and title in parallel
        const [translatedText, translatedTitle] = await Promise.all([
            translateForPreview(text, detectedSourceLang, targetLang),
            title ? translateForPreview(title, detectedSourceLang, targetLang) : Promise.resolve(null),
        ]);

        return NextResponse.json({
            translatedText,
            translatedTitle,
            sourceLang: detectedSourceLang,
            targetLang,
        });

    } catch (error) {
        console.error('Translation preview error:', error);
        return NextResponse.json(
            { error: 'Preview translation failed' },
            { status: 500 }
        );
    }
}
