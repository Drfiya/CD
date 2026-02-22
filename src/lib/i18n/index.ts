/**
 * Internationalization (i18n) System
 * 
 * Provides translated UI text based on user's preferred language.
 * Landing page content is translated via DeepL API.
 * Static UI messages have dedicated message files (en, de, es, fr).
 */

import { en, type Messages } from './messages/en';
import { de } from './messages/de';
import { es } from './messages/es';
import { fr } from './messages/fr';

// Static UI message translations (fallback to EN for unsupported languages)
const messages: Record<string, Messages> = {
    en,
    de,
    es,
    fr,
};

/**
 * Get messages for a specific locale
 * Falls back to English if locale not found
 */
export function getMessages(locale: string): Messages {
    // Normalize locale (e.g., 'en-US' -> 'en')
    const normalizedLocale = locale.toLowerCase().split('-')[0];
    return messages[normalizedLocale] || en;
}

/**
 * All supported languages (used for geo-detection, DeepL translation, admin dropdown).
 * These are the top 20 most commonly used web languages.
 */
export const availableLocales = [
    'en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'pl', 'ru', 'uk',
    'ja', 'ko', 'zh', 'ar', 'tr', 'sv', 'da', 'fi', 'nb', 'cs',
];

/**
 * Human-readable language names with flags (for admin UI)
 */
export const SUPPORTED_LANGUAGES: { code: string; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', label: 'Polski', flag: '🇵🇱' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'uk', label: 'Українська', flag: '🇺🇦' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
    { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
    { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
    { code: 'da', label: 'Dansk', flag: '🇩🇰' },
    { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
    { code: 'nb', label: 'Norsk', flag: '🇳🇴' },
    { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
];

// Re-export types
export type { Messages };
