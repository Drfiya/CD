'use client';

/**
 * Translation Context Provider
 * 
 * Provides global translation state and functions to the entire app.
 * - Manages current language preference
 * - Persists to localStorage and optionally to user profile
 * - Triggers re-translation when language changes
 */

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    ReactNode
} from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LANGUAGES, getBaseLanguage, isLanguageSupported, type LanguageCode } from '@/lib/translation/client/language-codes';

const STORAGE_KEY = 'preferred_language';

interface TranslationContextValue {
    /** Current language code (e.g., 'en', 'es', 'fr') */
    currentLanguage: string;
    /** Set the preferred language */
    setLanguage: (lang: string) => void;
    /** Whether translation is currently in progress */
    isTranslating: boolean;
    /** Set translation loading state */
    setIsTranslating: (value: boolean) => void;
    /** Trigger a full page re-translation */
    triggerRetranslation: () => void;
    /** Counter that increments on each retranslation request */
    translationVersion: number;
    /** List of supported languages for the selector UI */
    supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
    children: ReactNode;
    /** Initial language from server (user's profile preference) */
    initialLanguage?: string;
}

/**
 * Get the initial language preference
 * Priority: server prop > localStorage > browser language > English
 */
function getInitialLanguage(serverLanguage?: string): string {
    // Server-provided language takes priority (from user profile)
    if (serverLanguage && isLanguageSupported(serverLanguage)) {
        return getBaseLanguage(serverLanguage);
    }

    // Check localStorage
    if (typeof window !== 'undefined') {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored && isLanguageSupported(stored)) {
                return getBaseLanguage(stored);
            }
        } catch {
            // localStorage unavailable
        }

        // Check browser language
        const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
        if (browserLang && isLanguageSupported(browserLang)) {
            return getBaseLanguage(browserLang);
        }
    }

    // Default to English
    return 'en';
}

export function TranslationProvider({
    children,
    initialLanguage
}: TranslationProviderProps) {
    const router = useRouter();
    const [currentLanguage, setCurrentLanguage] = useState(() =>
        getInitialLanguage(initialLanguage)
    );
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationVersion, setTranslationVersion] = useState(0);

    // Persist language changes to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem(STORAGE_KEY, currentLanguage);
            } catch {
                // Ignore
            }
        }
    }, [currentLanguage]);

    // Optionally sync to user profile via API
    const syncToProfile = useCallback(async (lang: string) => {
        try {
            // Only sync if user is logged in (check for session)
            const response = await fetch('/api/user/language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ languageCode: lang }),
            });

            if (!response.ok) {
                // Silent fail - localStorage is the primary persistence
                console.debug('Could not sync language to profile');
            }
        } catch {
            // Silent fail
        }
    }, []);

    const setLanguage = useCallback((lang: string) => {
        const normalized = getBaseLanguage(lang);

        if (!isLanguageSupported(normalized)) {
            console.warn(`Language '${lang}' is not supported, defaulting to English`);
            setCurrentLanguage('en');
            return;
        }

        if (normalized !== currentLanguage) {
            setCurrentLanguage(normalized);
            syncToProfile(normalized);
            // Trigger retranslation when language changes
            setTranslationVersion(v => v + 1);

            // Set server-side cookie so getUserLanguage() picks it up on next SSR
            fetch('/api/set-language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: normalized }),
            }).then(() => {
                // Re-render server components (layout, nav labels, etc.)
                router.refresh();
            }).catch(() => {
                // Still refresh even if cookie-set fails
                router.refresh();
            });
        }
    }, [currentLanguage, syncToProfile, router]);

    const triggerRetranslation = useCallback(() => {
        setTranslationVersion(v => v + 1);
    }, []);

    const value = useMemo<TranslationContextValue>(() => ({
        currentLanguage,
        setLanguage,
        isTranslating,
        setIsTranslating,
        triggerRetranslation,
        translationVersion,
        supportedLanguages: SUPPORTED_LANGUAGES,
    }), [
        currentLanguage,
        setLanguage,
        isTranslating,
        triggerRetranslation,
        translationVersion
    ]);

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
}

/**
 * Hook to access translation context
 */
export function useTranslation(): TranslationContextValue {
    const context = useContext(TranslationContext);

    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }

    return context;
}

/**
 * Hook to get just the current language (lighter weight)
 */
export function useCurrentLanguage(): string {
    const { currentLanguage } = useTranslation();
    return currentLanguage;
}

/**
 * Hook to check if we should translate (not English)
 */
export function useShouldTranslate(): boolean {
    const { currentLanguage } = useTranslation();
    return currentLanguage !== 'en';
}
