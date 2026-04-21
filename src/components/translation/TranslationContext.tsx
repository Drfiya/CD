'use client';

/**
 * Translation Context Provider
 *
 * Provides global translation state and functions to the entire app.
 * - Manages current language preference
 * - Persists to localStorage and optionally to user profile
 * - Triggers re-translation when language changes
 * - Exposes static i18n messages via useTranslations() so client
 *   components read directly from context instead of prop-drilling
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
import { getMessages, type Messages } from '@/lib/i18n';

const STORAGE_KEY = 'preferred_language';

export interface ActiveLanguage {
    code: string;
    name: string;
    flag: string;
}

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
    /** Admin-toggled active languages (from DB, with fallback to static list) */
    activeLanguages: ActiveLanguage[];
    /** Static i18n messages for current language — use useTranslations() for namespaced access */
    messages: Messages;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

interface TranslationProviderProps {
    children: ReactNode;
    /** Initial language from server (user's profile preference) */
    initialLanguage?: string;
    /** Admin-toggled active languages, threaded from root layout */
    activeLanguages?: ActiveLanguage[];
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

const DEFAULT_ACTIVE_LANGUAGES: ActiveLanguage[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
];

export function TranslationProvider({
    children,
    initialLanguage,
    activeLanguages = DEFAULT_ACTIVE_LANGUAGES,
}: TranslationProviderProps) {
    const router = useRouter();
    const [currentLanguage, setCurrentLanguage] = useState(() =>
        getInitialLanguage(initialLanguage)
    );
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationVersion, setTranslationVersion] = useState(0);

    const messages = useMemo(() => getMessages(currentLanguage), [currentLanguage]);

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

            // Optimistic client-side cookie write so SSR on the very next refresh
            // sees the new language without waiting for the POST round-trip.
            // Server route also sets the same cookie (canonical) + persists to DB.
            if (typeof document !== 'undefined') {
                const oneYear = 60 * 60 * 24 * 365;
                const secure =
                    typeof window !== 'undefined' && window.location.protocol === 'https:'
                        ? '; Secure'
                        : '';
                document.cookie = `preferred-language=${normalized}; path=/; max-age=${oneYear}; SameSite=Lax${secure}`;
            }

            // Re-render server components immediately (layout, nav labels, etc.)
            router.refresh();

            // Fire-and-forget POST: persists to DB for logged-in users and sets the
            // canonical cookie server-side. We don't await it — the optimistic cookie
            // above already unblocked the refresh.
            void fetch('/api/set-language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: normalized }),
            }).catch(() => {
                // Silent — optimistic cookie already wrote the value.
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
        activeLanguages,
        messages,
    }), [
        currentLanguage,
        setLanguage,
        isTranslating,
        triggerRetranslation,
        translationVersion,
        activeLanguages,
        messages,
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

/**
 * Hook to access the full Messages object for current language
 */
export function useMessages(): Messages {
    const { messages } = useTranslation();
    return messages;
}

/**
 * Hook to access a specific i18n namespace.
 * Eliminates prop-drilling of UI strings through server → client boundaries.
 *
 * @example
 *   const ui = useTranslations('classroomPage');
 *   return <h1>{ui.title}</h1>;
 */
export function useTranslations<K extends keyof Messages>(namespace: K): Messages[K] {
    const { messages } = useTranslation();
    return messages[namespace];
}
