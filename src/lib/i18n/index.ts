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
    'en', 'de', 'fr',
];

/**
 * Human-readable language names with flags (for admin UI)
 */
export const SUPPORTED_LANGUAGES: { code: string; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

// Re-export types
export type { Messages };
