'use client';

/**
 * TranslationPreview (C2) - "Ubersetzungs-Vorschau" for the Post Editor
 *
 * A "Preview Translation" button for the post/comment editor.
 * When clicked, calls /api/translate/preview to get a translation and
 * shows a split view: original on the left, translation on the right
 * (stacked on mobile). The author can choose the target language.
 *
 * Preview results are cached client-side for the session to avoid
 * redundant API calls.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
    SUPPORTED_LANGUAGES,
    getLanguageInfo,
    type LanguageCode,
} from '@/lib/translation/client/language-codes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranslationPreviewProps {
    /** The current text in the editor */
    sourceText: string;
    /** ISO 639-1 code of the source text, e.g. 'fr' */
    sourceLanguage: string;
    /** Callback when a preview translation is generated */
    onPreviewGenerated?: (targetLang: string, translatedText: string) => void;
}

interface CacheEntry {
    sourceText: string;
    targetLang: string;
    translatedText: string;
}

// ─── Spinner Icon ────────────────────────────────────────────────────────────

function SpinnerIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
        </svg>
    );
}

// ─── Chevron Icon ────────────────────────────────────────────────────────────

function ChevronDownIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

// ─── Eye/Preview Icon ────────────────────────────────────────────────────────

function EyeIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path
                fillRule="evenodd"
                d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TranslationPreview({
    sourceText,
    sourceLanguage,
    onPreviewGenerated,
}: TranslationPreviewProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewText, setPreviewText] = useState<string | null>(null);

    // Default target language: English unless source is English, then German
    const defaultTarget = sourceLanguage === 'en' ? 'de' : 'en';
    const [targetLang, setTargetLang] = useState<string>(defaultTarget);

    // Session-level cache to avoid redundant API calls
    const cacheRef = useRef<CacheEntry[]>([]);

    // Debounce state for Preview button / language switch clicks.
    // Prevents rapid-fire clicks from spawning parallel /api/translate/preview
    // requests (each a potential DeepL character charge on first-time text).
    // The server already caches via the 3-tier lookup, but coalescing on the
    // client avoids the race where two concurrent clicks both miss the cache
    // before either write lands.
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inflightRef = useRef<string | null>(null);
    const PREVIEW_DEBOUNCE_MS = 400;

    // Build the list of available target languages (exclude source language)
    const availableTargetLanguages = useMemo(() => {
        return (Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]).filter(
            (code) => code !== sourceLanguage
        );
    }, [sourceLanguage]);

    // Resolve display names
    const sourceInfo = getLanguageInfo(sourceLanguage);
    const sourceDisplayName = sourceInfo
        ? sourceInfo.nativeName
        : sourceLanguage.toUpperCase();

    const targetInfo = getLanguageInfo(targetLang);
    const targetDisplayName = targetInfo
        ? targetInfo.name
        : targetLang.toUpperCase();

    /**
     * Check the session cache for a matching translation
     */
    const getCached = useCallback(
        (text: string, lang: string): string | null => {
            const entry = cacheRef.current.find(
                (e) => e.sourceText === text && e.targetLang === lang
            );
            return entry?.translatedText ?? null;
        },
        []
    );

    /**
     * Store a translation result in the session cache
     */
    const setCache = useCallback(
        (text: string, lang: string, translated: string) => {
            // Evict duplicates before adding
            cacheRef.current = cacheRef.current.filter(
                (e) => !(e.sourceText === text && e.targetLang === lang)
            );
            cacheRef.current.push({
                sourceText: text,
                targetLang: lang,
                translatedText: translated,
            });
            // Keep cache bounded
            if (cacheRef.current.length > 50) {
                cacheRef.current = cacheRef.current.slice(-50);
            }
        },
        []
    );

    /**
     * Fetch a translation preview from the API
     */
    const fetchPreview = useCallback(
        async (lang: string) => {
            if (!sourceText.trim()) {
                setError('No text to preview.');
                return;
            }

            // Check cache first
            const cached = getCached(sourceText, lang);
            if (cached) {
                setPreviewText(cached);
                onPreviewGenerated?.(lang, cached);
                return;
            }

            // Client-side deduplication: if an identical request is already
            // in flight, skip this invocation and let the first one settle.
            const reqKey = `${lang}::${sourceText}`;
            if (inflightRef.current === reqKey) {
                return;
            }
            inflightRef.current = reqKey;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/translate/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: sourceText,
                        targetLang: lang,
                        sourceLang: sourceLanguage,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(
                        errorData?.error || `Preview failed (${response.status})`
                    );
                }

                const data = await response.json();
                const translated: string = data.sameLanguage
                    ? sourceText
                    : data.translatedText;

                setPreviewText(translated);
                setCache(sourceText, lang, translated);
                onPreviewGenerated?.(lang, translated);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Translation preview is currently unavailable. Please try again.'
                );
            } finally {
                setLoading(false);
                inflightRef.current = null;
            }
        },
        [sourceText, sourceLanguage, getCached, setCache, onPreviewGenerated]
    );

    /**
     * Debounced wrapper around fetchPreview. Multiple rapid calls (button
     * spam, language-switch double-click) collapse into a single API hit.
     */
    const scheduleFetchPreview = useCallback(
        (lang: string) => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                fetchPreview(lang);
            }, PREVIEW_DEBOUNCE_MS);
        },
        [fetchPreview]
    );

    /**
     * Open the preview panel and fetch the translation
     */
    const handleOpen = useCallback(() => {
        setIsOpen(true);
        scheduleFetchPreview(targetLang);
    }, [scheduleFetchPreview, targetLang]);

    /**
     * When the target language changes, re-fetch
     */
    const handleLanguageChange = useCallback(
        (e: React.ChangeEvent<HTMLSelectElement>) => {
            const lang = e.target.value;
            setTargetLang(lang);
            setPreviewText(null);
            scheduleFetchPreview(lang);
        },
        [scheduleFetchPreview]
    );

    // ─── Collapsed: just a button ────────────────────────────────────────────

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={handleOpen}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#D94A4A' }}
            >
                <span className="inline-flex items-center gap-1.5">
                    <EyeIcon className="w-3.5 h-3.5" />
                    Preview Translation
                </span>
            </button>
        );
    }

    // ─── Expanded: split preview ─────────────────────────────────────────────

    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/60">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                    Translation Preview
                </h4>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label="Close preview"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* Split panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-neutral-700">
                {/* ─── Left: Original ───────────────────────────────── */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            Original ({sourceDisplayName})
                        </span>
                    </div>
                    <div className="text-sm text-gray-800 dark:text-neutral-200 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words min-h-[80px]">
                        {sourceText || (
                            <span className="text-gray-400 dark:text-neutral-500 italic">
                                Start typing to see a preview...
                            </span>
                        )}
                    </div>
                </div>

                {/* ─── Right: Translation ───────────────────────────── */}
                <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            Preview ({targetDisplayName})
                        </span>
                        {/* Language selector */}
                        <div className="relative">
                            <select
                                value={targetLang}
                                onChange={handleLanguageChange}
                                disabled={loading}
                                className="appearance-none px-2 py-1 pr-6 text-xs rounded border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 outline-none focus:border-gray-400 dark:focus:border-neutral-400 disabled:opacity-50 cursor-pointer"
                            >
                                {availableTargetLanguages.map((code) => {
                                    const info = getLanguageInfo(code);
                                    return (
                                        <option key={code} value={code}>
                                            {info ? info.name : code.toUpperCase()}
                                        </option>
                                    );
                                })}
                            </select>
                            <ChevronDownIcon className="absolute right-1 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-neutral-500 pointer-events-none" />
                        </div>
                    </div>

                    {/* Preview content */}
                    <div className="text-sm text-gray-800 dark:text-neutral-200 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words min-h-[80px]">
                        {loading ? (
                            <div className="flex items-center justify-center py-6">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-neutral-400">
                                    <SpinnerIcon className="animate-spin h-4 w-4" />
                                    <span className="text-xs">Translating...</span>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="text-sm text-red-600 dark:text-red-300">
                                {error}
                                <button
                                    type="button"
                                    onClick={() => fetchPreview(targetLang)}
                                    className="ml-2 underline text-xs hover:no-underline"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : previewText ? (
                            previewText
                        ) : (
                            <span className="text-gray-400 dark:text-neutral-500 italic">
                                Translation will appear here...
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer with refresh action */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/60 flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-neutral-500">
                    This is an approximate preview. Readers may see slightly different results.
                </p>
                <button
                    type="button"
                    onClick={() => fetchPreview(targetLang)}
                    disabled={loading || !sourceText.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#D94A4A' }}
                >
                    {loading ? 'Translating...' : 'Refresh Preview'}
                </button>
            </div>
        </div>
    );
}
