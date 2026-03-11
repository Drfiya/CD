'use client';

/**
 * TruthToggle (C1) - "Original anzeigen" Toggle
 *
 * A small shield/verify icon button placed next to every translated post or comment.
 * Clicking toggles INLINE between the translated text and the original text.
 * The switch is instant - both texts are already available, no API call needed.
 *
 * Uses a render-prop pattern so the parent decides how to display the text.
 */

import { useState, useCallback } from 'react';
import {
    SUPPORTED_LANGUAGES,
    getLanguageInfo,
} from '@/lib/translation/client/language-codes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TruthToggleProps {
    /** The text in the author's original language */
    originalText: string;
    /** The translated text in the reader's language */
    translatedText: string;
    /** ISO 639-1 code of the original language, e.g. 'fr' */
    originalLanguage: string;
    /** Whether the text was actually translated (false = same language, no toggle needed) */
    isTranslated: boolean;
    /** Render prop - receives the text to display and current toggle state */
    children: (props: {
        displayText: string;
        showingOriginal: boolean;
    }) => React.ReactNode;
}

// ─── Shield Icon (inline SVG) ────────────────────────────────────────────────

function ShieldCheckIcon({ className }: { className?: string }) {
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
                d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.59 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.54.035-1.07.104-1.59a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749ZM14.03 8.03a.75.75 0 0 0-1.06-1.06L9.5 10.44 7.53 8.47a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l4-4Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TruthToggle({
    originalText,
    translatedText,
    originalLanguage,
    isTranslated,
    children,
}: TruthToggleProps) {
    const [showingOriginal, setShowingOriginal] = useState(false);

    const handleToggle = useCallback(() => {
        setShowingOriginal((prev) => !prev);
    }, []);

    // If the text was not translated (same language), just render
    // the children with the original text and no toggle button
    if (!isTranslated) {
        return (
            <>
                {children({ displayText: originalText, showingOriginal: false })}
            </>
        );
    }

    // Resolve language display name
    const langInfo = getLanguageInfo(originalLanguage);
    const languageDisplayName = langInfo
        ? langInfo.nativeName
        : originalLanguage.toUpperCase();

    // Determine which text to show
    const displayText = showingOriginal ? originalText : translatedText;

    return (
        <div className="truth-toggle-wrapper">
            {/* Render the text via the render prop */}
            {children({ displayText, showingOriginal })}

            {/* Toggle button row */}
            <div className="mt-1.5 flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleToggle}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        showingOriginal
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300'
                    }`}
                    aria-pressed={showingOriginal}
                    aria-label={
                        showingOriginal
                            ? 'Show translation'
                            : `Show original text written in ${languageDisplayName}`
                    }
                >
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    <span>
                        {showingOriginal ? 'Show translation' : 'Show original'}
                    </span>
                </button>

                {/* Language label - only visible when showing original */}
                {showingOriginal && (
                    <span className="text-xs text-blue-500 dark:text-blue-400 select-none">
                        Original &ndash; Written in {languageDisplayName}
                    </span>
                )}
            </div>
        </div>
    );
}
