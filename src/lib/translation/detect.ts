/**
 * Language Detection Module
 *
 * Uses DeepL's translation API to identify the source language of text.
 */

import { detectLanguageViaTranslation } from './providers/deepl';

/**
 * Detect the language of the given text
 * Returns lowercase ISO 639-1 code (e.g., "en", "de", "fr")
 * Falls back to "en" on error or if detection fails
 */
export async function detectLanguage(text: string): Promise<string> {
    if (!text || !text.trim()) {
        return 'en';
    }

    try {
        // Use the first 200 characters for detection (DeepL limit)
        const sampleText = text.slice(0, 200);
        const detectedLang = await detectLanguageViaTranslation(sampleText);

        return detectedLang || 'en';
    } catch (error) {
        console.error('Language detection failed:', error);
        return 'en';
    }
}
