/**
 * DeepL Client-Side Translation Service
 * 
 * Fetches translations via the /api/translate endpoint.
 * Features:
 * - Batch queuing with debouncing (50ms window)
 * - Two-tier caching (memory + localStorage)
 * - Graceful fallback to original text on errors
 */

import {
    getFromCache,
    setBatchToCache,
    getBatchFromCache
} from './cache-client';
import { toDeepLTarget, getBaseLanguage } from './language-codes';

// Batch queue for collecting translation requests
interface QueuedRequest {
    text: string;
    targetLang: string;
    resolve: (translation: string) => void;
    reject: (error: Error) => void;
}

let requestQueue: QueuedRequest[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const BATCH_DELAY = 50; // ms to wait before sending batch
const MAX_BATCH_SIZE = 50; // Maximum texts per API call

/**
 * Translate a single text string
 * Uses batching and caching automatically
 */
export async function translateText(
    text: string,
    targetLang: string,
    sourceLang: string = 'en'
): Promise<string> {
    // Skip empty or whitespace-only text
    if (!text.trim()) {
        return text;
    }

    // Skip if source and target are the same
    if (getBaseLanguage(sourceLang) === getBaseLanguage(targetLang)) {
        return text;
    }

    // Check cache first
    const cached = getFromCache(text, targetLang);
    if (cached !== null) {
        return cached;
    }

    // Queue the request
    return new Promise((resolve, reject) => {
        requestQueue.push({ text, targetLang, resolve, reject });
        scheduleFlush();
    });
}

/**
 * Translate multiple texts at once
 * More efficient than calling translateText multiple times
 */
export async function translateBatch(
    texts: string[],
    targetLang: string,
    sourceLang?: string  // Optional - if omitted, DeepL will auto-detect
): Promise<string[]> {
    if (texts.length === 0) {
        return [];
    }

    // Only skip if source is known and matches target
    if (sourceLang && getBaseLanguage(sourceLang) === getBaseLanguage(targetLang)) {
        return texts;
    }

    // Check what's already cached
    const cacheResults = getBatchFromCache(texts, targetLang);
    const toTranslate: string[] = [];
    const indexMap: number[] = []; // Maps toTranslate index to original index

    texts.forEach((text, index) => {
        if (!text.trim()) {
            return; // Skip empty
        }
        const cached = cacheResults.get(text);
        if (cached === null) {
            toTranslate.push(text);
            indexMap.push(index);
        }
    });

    // If everything is cached, return immediately
    if (toTranslate.length === 0) {
        return texts.map(text => cacheResults.get(text) || text);
    }

    // Translate uncached texts
    try {
        const translations = await fetchTranslations(toTranslate, targetLang, sourceLang);

        // Cache the results and build final array
        const cacheItems: Array<{ text: string; targetLang: string; translation: string }> = [];
        translations.forEach((translation, i) => {
            const originalText = toTranslate[i];
            cacheItems.push({ text: originalText, targetLang, translation });
            cacheResults.set(originalText, translation);
        });
        setBatchToCache(cacheItems);

        // Build result array
        return texts.map(text => {
            if (!text.trim()) return text;
            return cacheResults.get(text) || text;
        });
    } catch (error) {
        console.error('Batch translation failed:', error);
        return texts; // Return original texts on error
    }
}

/**
 * Schedule flushing the request queue
 */
function scheduleFlush(): void {
    if (flushTimeout !== null) {
        return; // Already scheduled
    }

    flushTimeout = setTimeout(() => {
        flushQueue();
        flushTimeout = null;
    }, BATCH_DELAY);
}

/**
 * Process all queued requests
 */
async function flushQueue(): Promise<void> {
    if (requestQueue.length === 0) {
        return;
    }

    // Take all current requests
    const requests = [...requestQueue];
    requestQueue = [];

    // Group by target language
    const byLanguage = new Map<string, QueuedRequest[]>();
    requests.forEach(req => {
        const group = byLanguage.get(req.targetLang) || [];
        group.push(req);
        byLanguage.set(req.targetLang, group);
    });

    // Process each language group
    for (const [targetLang, langRequests] of byLanguage) {
        // Split into chunks of MAX_BATCH_SIZE
        for (let i = 0; i < langRequests.length; i += MAX_BATCH_SIZE) {
            const chunk = langRequests.slice(i, i + MAX_BATCH_SIZE);
            const texts = chunk.map(r => r.text);

            try {
                const translations = await fetchTranslations(texts, targetLang);

                // Cache and resolve
                const cacheItems: Array<{ text: string; targetLang: string; translation: string }> = [];
                chunk.forEach((req, index) => {
                    const translation = translations[index] || req.text;
                    cacheItems.push({ text: req.text, targetLang, translation });
                    req.resolve(translation);
                });
                setBatchToCache(cacheItems);

            } catch {
                // Resolve with original text on error
                chunk.forEach(req => {
                    req.resolve(req.text);
                });
            }
        }
    }
}

/**
 * Make the actual API call to /api/translate
 */
async function fetchTranslations(
    texts: string[],
    targetLang: string,
    sourceLang?: string  // Optional - if omitted, DeepL will auto-detect
): Promise<string[]> {
    const body: Record<string, unknown> = {
        texts,
        targetLang: toDeepLTarget(targetLang),
    };

    // Only include sourceLang if specified (otherwise DeepL auto-detects)
    if (sourceLang) {
        body.sourceLang = toDeepLTarget(sourceLang);
    }

    const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error && !data.fallback) {
        throw new Error(data.error);
    }

    return data.translations || texts;
}

/**
 * Pre-warm the cache with common UI strings
 * Call this on app initialization with known UI strings
 */
export async function preloadTranslations(
    texts: string[],
    targetLang: string
): Promise<void> {
    if (getBaseLanguage(targetLang) === 'en') {
        return; // No need to preload English
    }

    // Filter to only uncached texts
    const uncached = texts.filter(text => getFromCache(text, targetLang) === null);

    if (uncached.length > 0) {
        await translateBatch(uncached, targetLang);
    }
}
