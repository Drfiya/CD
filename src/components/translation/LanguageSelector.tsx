'use client';

/**
 * Language Selector Component
 * 
 * Dropdown for selecting the preferred language.
 * Shows language names in their native script for easy identification.
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from './TranslationContext';

// Inline Globe icon to avoid adding lucide-react dependency
function GlobeIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.97.633-3.793 1.708-5.275"
            />
        </svg>
    );
}

interface LanguageSelectorProps {
    /** Which edge the dropdown aligns to. Default 'right' (desktop header). */
    dropdownAlign?: 'left' | 'right';
}

export function LanguageSelector({ dropdownAlign = 'right' }: LanguageSelectorProps) {
    const { currentLanguage, setLanguage, supportedLanguages, isTranslating } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const currentLangInfo = supportedLanguages[currentLanguage as keyof typeof supportedLanguages];
    const currentDisplayName = currentLangInfo?.nativeName || currentLanguage.toUpperCase();

    // Sort languages by English name for consistent ordering
    const sortedLanguages = Object.entries(supportedLanguages)
        .sort(([, a], [, b]) => a.name.localeCompare(b.name));

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Select language"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <GlobeIcon className={`w-4 h-4 ${isTranslating ? 'animate-pulse text-blue-500' : ''}`} />
                <span className="hidden sm:inline" data-no-translate>
                    {currentDisplayName}
                </span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className={`absolute ${dropdownAlign === 'left' ? 'left-0' : 'right-0'} mt-2 w-56 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-gray-200 dark:border-neutral-700 py-1 z-50 max-h-80 overflow-y-auto`}
                    role="listbox"
                    aria-label="Select language"
                >
                    {sortedLanguages.map(([code, info]) => (
                        <button
                            key={code}
                            onClick={() => {
                                setLanguage(code);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${code === currentLanguage ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                                }`}
                            role="option"
                            aria-selected={code === currentLanguage}
                        >
                            <span className="flex flex-col">
                                <span data-no-translate>{info.nativeName}</span>
                                <span className="text-xs text-gray-500" data-no-translate>{info.name}</span>
                            </span>
                            {code === currentLanguage && (
                                <svg
                                    className="w-4 h-4 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
