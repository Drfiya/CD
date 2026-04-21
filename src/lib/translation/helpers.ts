/**
 * UI Translation Helpers
 * 
 * Helper functions for getting user language and translating UI text.
 * Supports IP-based geolocation detection for automatic language selection.
 */

import { cache } from 'react';
import { getServerSession } from 'next-auth';
import { headers, cookies } from 'next/headers';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { translateUIText as translateText } from '@/lib/translation/ui';
import {
    getLanguageFromCountry,
    getLanguageFromAcceptHeader,
    LANGUAGE_COOKIE_NAME
} from '@/lib/i18n/geolocation';

/**
 * Get the current user's preferred language code
 *
 * Priority order:
 * 1. Logged-in user's database preference
 * 2. Language cookie (for guests who manually selected a language)
 * 3. IP geolocation (Vercel: x-vercel-ip-country, Cloudflare: cf-ipcountry)
 * 4. Accept-Language header (browser preference)
 * 5. Fallback to English
 *
 * Wrapped in React.cache() so the (potentially DB-hitting) resolution runs once
 * per request, even when called from layout + page + child server components.
 */
export const getUserLanguage = cache(async function getUserLanguage(): Promise<string> {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // 1. Check logged-in user's database preference
    if (userId) {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { languageCode: true },
        });
        if (user?.languageCode) {
            return user.languageCode;
        }
    }

    // 2. Check for language cookie (manual selection by guest)
    const cookieStore = await cookies();
    const languageCookie = cookieStore.get(LANGUAGE_COOKIE_NAME);
    if (languageCookie?.value) {
        return languageCookie.value;
    }

    // 3. Check IP geolocation headers
    const headersList = await headers();

    // Vercel provides x-vercel-ip-country
    const vercelCountry = headersList.get('x-vercel-ip-country');
    if (vercelCountry) {
        return getLanguageFromCountry(vercelCountry);
    }

    // Cloudflare provides cf-ipcountry
    const cloudflareCountry = headersList.get('cf-ipcountry');
    if (cloudflareCountry) {
        return getLanguageFromCountry(cloudflareCountry);
    }

    // 4. Check Accept-Language header (browser preference)
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
        return getLanguageFromAcceptHeader(acceptLanguage);
    }

    // 5. Fallback to English
    return 'en';
});

/**
 * Translate a UI text string for the current user
 */
export async function t(
    text: string,
    context: string = 'general'
): Promise<string> {
    const userLanguage = await getUserLanguage();

    if (userLanguage === 'en') {
        return text;
    }

    return translateText(text, 'en', userLanguage, context);
}

/**
 * Translate multiple UI text strings in parallel
 */
export async function tMany(
    texts: Record<string, string>,
    context: string = 'general'
): Promise<Record<string, string>> {
    const userLanguage = await getUserLanguage();

    if (userLanguage === 'en') {
        return texts;
    }

    const entries = Object.entries(texts);
    const translatedValues = await Promise.all(
        entries.map(([, value]) => translateText(value, 'en', userLanguage, context))
    );

    const result: Record<string, string> = {};
    entries.forEach(([key], index) => {
        result[key] = translatedValues[index];
    });

    return result;
}
