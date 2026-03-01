'use client';

import { useState, useEffect, useCallback } from 'react';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/lib/translation/constants';

interface TranslationPreviewModalProps {
    originalText: string;
    originalTitle?: string;
    sourceLang?: string;
    onClose: () => void;
}

export function TranslationPreviewModal({
    originalText,
    originalTitle,
    sourceLang,
    onClose,
}: TranslationPreviewModalProps) {
    const [targetLang, setTargetLang] = useState<string>('en');
    const [preview, setPreview] = useState<string | null>(null);
    const [previewTitle, setPreviewTitle] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Set default target to English, unless source is English
    useEffect(() => {
        if (sourceLang === 'en') {
            setTargetLang('de'); // Default to German if source is English
        }
    }, [sourceLang]);

    const loadPreview = useCallback(async () => {
        if (!originalText.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/translate/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: originalText,
                    title: originalTitle,
                    targetLang,
                    sourceLang,
                }),
            });

            if (!response.ok) {
                throw new Error('Preview failed');
            }

            const data = await response.json();

            if (data.sameLanguage) {
                setPreview(originalText);
                setPreviewTitle(originalTitle || null);
            } else {
                setPreview(data.translatedText);
                setPreviewTitle(data.translatedTitle || null);
            }
        } catch {
            setError('Translation preview is currently unavailable. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [originalText, originalTitle, targetLang, sourceLang]);

    useEffect(() => {
        loadPreview();
    }, [loadPreview]);

    // Available target languages (exclude source language)
    const availableLanguages = SUPPORTED_LANGUAGES.filter(
        (lang) => lang !== sourceLang
    );

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-neutral-800 rounded-xl w-full max-w-lg mx-4 shadow-xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-neutral-700">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                            Translation Preview
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                            How a {LANGUAGE_NAMES[targetLang as SupportedLanguage] || targetLang}-speaking colleague reads your post
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Language selector */}
                <div className="px-5 pt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
                        Preview language
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {availableLanguages.map((lang) => (
                            <button
                                key={lang}
                                onClick={() => setTargetLang(lang)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    targetLang === lang
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                                }`}
                            >
                                {LANGUAGE_NAMES[lang as SupportedLanguage] || lang}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-3 text-gray-500 dark:text-neutral-400">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span className="text-sm">Translating...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {previewTitle && (
                                <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                                    {previewTitle}
                                </h4>
                            )}
                            <div className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
                                {preview}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-neutral-700">
                    <button
                        onClick={onClose}
                        className="w-full px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
