/**
 * Translation Debug Endpoint
 *
 * GET /api/translation-debug
 *
 * Returns diagnostic information about the translation system.
 * Shows user language, recent posts with their languageCode,
 * and whether translations would be triggered.
 *
 * ⚠️ Admin-only. Remove this route before going to production.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { getUserLanguage } from '@/lib/translation/helpers';

export async function GET() {
    // F8: production exposure guard. The route ships behind a dev-only
    // opt-in so an unintentionally admin-flagged DB row in prod cannot
    // leak DeepL usage + post metadata.
    const debugEnabled =
        process.env.NODE_ENV !== 'production' ||
        process.env.ENABLE_TRANSLATION_DEBUG === 'true';
    if (!debugEnabled) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, languageCode: true, role: true },
    });

    if (user?.role !== 'admin') {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get the language that getUserLanguage() resolves to
    const resolvedLanguage = await getUserLanguage();

    // Get recent posts with their language info
    const recentPosts = await db.post.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            title: true,
            languageCode: true,
            contentHash: true,
            plainText: true,
            createdAt: true,
            author: { select: { name: true } },
        },
    });

    // Check translation table for any cached translations
    let translationCount = 0;
    try {
        translationCount = await db.translation.count();
    } catch {
        // Table might not exist yet
    }

    // Check DeepL API key
    const hasDeeplKey = !!process.env.DEEPL_API_KEY;
    const deeplUrl = process.env.DEEPL_API_URL || 'not set';

    // Test DeepL connection
    let deeplStatus = 'not tested';
    if (hasDeeplKey) {
        try {
            const res = await fetch(`${process.env.DEEPL_API_URL || 'https://api.deepl.com'}/v2/usage`, {
                headers: { 'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}` },
            });
            if (res.ok) {
                const data = await res.json();
                deeplStatus = `OK - ${data.character_count}/${data.character_limit} chars used`;
            } else {
                deeplStatus = `Error ${res.status}: ${res.statusText}`;
            }
        } catch (e: unknown) {
            deeplStatus = `Connection failed: ${e instanceof Error ? e.message : 'unknown'}`;
        }
    }

    const postsAnalysis = recentPosts.map((p) => {
        const postLang = p.languageCode || 'en (default - NULL in DB)';
        const wouldTranslate = (p.languageCode || 'en') !== resolvedLanguage;
        return {
            id: p.id,
            title: p.title?.substring(0, 50) || '(no title)',
            author: p.author.name,
            languageCode: postLang,
            hasPlainText: !!p.plainText,
            plainTextLength: p.plainText?.length || 0,
            wouldTranslateForYou: wouldTranslate,
            reason: wouldTranslate
                ? `Post(${p.languageCode || 'en'}) ≠ User(${resolvedLanguage}) → TRANSLATE`
                : `Post(${p.languageCode || 'en'}) = User(${resolvedLanguage}) → SKIP`,
        };
    });

    return NextResponse.json({
        diagnosis: {
            currentUser: {
                name: user?.name,
                languageCodeInDB: user?.languageCode || 'NULL',
                resolvedLanguage,
                explanation: user?.languageCode
                    ? `Language "${resolvedLanguage}" comes from your DB setting`
                    : `Language "${resolvedLanguage}" comes from fallback (cookie/IP/Accept-Language/default)`,
            },
            deepl: {
                hasApiKey: hasDeeplKey,
                apiUrl: deeplUrl,
                status: deeplStatus,
            },
            database: {
                cachedTranslations: translationCount,
            },
            recentPosts: postsAnalysis,
            truthToggleLogic: {
                explanation: 'The Truth toggle appears when: (1) translatedPlainText exists, (2) userLanguage is set, (3) postLanguage ≠ userLanguage',
                yourLanguage: resolvedLanguage,
                actionNeeded: resolvedLanguage === 'en'
                    ? '⚠️ Your language is "en". Most posts are also "en". Go to Profile → Edit and change Preferred Language to "de" to see translations.'
                    : `✅ Your language is "${resolvedLanguage}". English posts should show the Truth toggle.`,
            },
        },
    }, { status: 200 });
}
