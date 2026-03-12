'use client';

import { useState } from 'react';
import { getLanguageName } from '@/lib/translation/constants';

interface TranslationToggleProps {
    postId: string;
    originalLanguage: string;
    userLanguage: string;
    originalPlainText: string;
    originalTitle?: string;
    translatedPlainText: string;
    translatedTitle?: string;
    onToggle: (showOriginal: boolean) => void;
}

/**
 * "Trues" button - toggles between translated and original text
 *
 * Only shown when the post was actually translated (different languages).
 * - Default: shows translated text
 * - Click: shows original text
 * - Click again: shows translated text
 */
export function TranslationToggle({
    originalLanguage,
    userLanguage,
    onToggle,
}: TranslationToggleProps) {
    const [showOriginal, setShowOriginal] = useState(false);

    // Don't render if no translation happened
    if (originalLanguage === userLanguage) {
        return null;
    }

    const handleClick = () => {
        const newState = !showOriginal;
        setShowOriginal(newState);
        onToggle(newState);
    };

    return (
        <button
            data-no-translate
            onClick={handleClick}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={
                showOriginal
                    ? 'Show translation'
                    : `Show original (${getLanguageName(originalLanguage)})`
            }
        >
            <span className="text-sm">🌐</span>
            <span className="text-sm" translate="no">
                {showOriginal ? 'Translated' : 'Truth'}
            </span>
        </button>
    );
}
