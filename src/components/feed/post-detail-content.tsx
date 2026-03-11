'use client';

import { useState } from 'react';
import { getLanguageName } from '@/lib/translation/constants';

interface PostDetailContentProps {
    translatedTitle?: string | null;
    originalTitle?: string | null;
    translatedPlainText?: string | null;
    originalContent: string; // HTML from Tiptap
    originalLanguage: string;
    userLanguage: string;
}

/**
 * Client component wrapper for post detail content that supports
 * the Truth toggle between translated and original text.
 */
export function PostDetailContent({
    translatedTitle,
    originalTitle,
    translatedPlainText,
    originalContent,
    originalLanguage,
    userLanguage,
}: PostDetailContentProps) {
    const [showOriginal, setShowOriginal] = useState(false);
    const isTranslated = originalLanguage !== userLanguage && !!translatedPlainText;

    const displayTitle = isTranslated && !showOriginal
        ? translatedTitle
        : originalTitle;

    return (
        <>
            {/* Post title */}
            {displayTitle && (
                <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100 mb-2">
                    {displayTitle}
                </h1>
            )}

            {/* Post content */}
            {isTranslated && !showOriginal ? (
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {translatedPlainText}
                </div>
            ) : (
                <div
                    className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300"
                    dangerouslySetInnerHTML={{ __html: originalContent }}
                />
            )}

            {/* Truth toggle button - only if translation exists */}
            {isTranslated && (
                <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="mt-3 flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
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
            )}
        </>
    );
}
