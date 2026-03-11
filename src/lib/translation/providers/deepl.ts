/**
 * DeepL Translation Provider (Enhanced)
 *
 * Uses the DeepL API for high-quality, context-aware translations.
 * Features:
 * - Context-aware translation (surrounding paragraphs)
 * - Formality control per section
 * - DeepL Glossary integration
 * - HTML tag preservation
 * - Protected terms via XML ignore_tags
 */

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com';

/**
 * Map ISO 639-1 codes to DeepL format
 * DeepL uses uppercase and some variants (e.g., EN-US, EN-GB, PT-BR)
 */
function toDeepLLanguage(code: string, isTarget: boolean = false): string {
    const upperCode = code.toUpperCase();

    // For target languages, DeepL requires specific variants for some languages
    if (isTarget) {
        switch (upperCode) {
            case 'EN':
                return 'EN-US'; // Default to American English for targets
            case 'PT':
                return 'PT-BR'; // Default to Brazilian Portuguese for targets
            default:
                return upperCode;
        }
    }

    return upperCode;
}

/**
 * Map DeepL language codes back to ISO 639-1
 */
function fromDeepLLanguage(code: string): string {
    return code.split('-')[0].toLowerCase();
}

export interface TranslationResult {
    text: string;
    detectedSourceLanguage?: string;
}

// ─── Formality support ───────────────────────────────────────────────────────

/**
 * Languages that support the formality parameter in DeepL
 */
const FORMALITY_SUPPORTED_LANGUAGES = new Set([
    'DE', 'FR', 'IT', 'ES', 'NL', 'PL', 'PT', 'PT-BR', 'RU', 'JA',
]);

function supportsFormality(targetLang: string): boolean {
    const upper = targetLang.toUpperCase();
    return FORMALITY_SUPPORTED_LANGUAGES.has(upper) ||
        FORMALITY_SUPPORTED_LANGUAGES.has(upper.split('-')[0]);
}

// ─── Protected terms ─────────────────────────────────────────────────────────

/**
 * Wrap protected terms with XML <keep> tags for DeepL's ignore_tags feature
 */
function wrapProtectedTerms(text: string, protectedTerms: string[]): string {
    if (!protectedTerms || protectedTerms.length === 0) return text;

    let result = text;
    // Sort by length descending to handle overlapping terms
    const sorted = [...protectedTerms].sort((a, b) => b.length - a.length);
    for (const term of sorted) {
        const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<keep>)${escaped}(?!</keep>)`, 'gi');
        result = result.replace(regex, `<keep>${term}</keep>`);
    }
    return result;
}

/**
 * Remove <keep> tags from translated text, preserving the content inside
 */
function unwrapProtectedTerms(text: string): string {
    return text.replace(/<\/?keep>/g, '');
}

// ─── Enhanced translation options ────────────────────────────────────────────

export interface TranslateOptions {
    /** Surrounding text for context-aware translation */
    context?: string;
    /** Formality level: 'more' (formal), 'less' (informal), 'default' */
    formality?: 'more' | 'less' | 'default';
    /** DeepL Glossary ID for controlled terminology */
    glossaryId?: string;
    /** Preserve HTML tags during translation */
    tagHandling?: 'html' | 'xml';
    /** Terms to protect from translation */
    protectedTerms?: string[];
}

/**
 * Translate a single text using DeepL (enhanced with context, formality, glossary)
 */
export async function translateText(
    text: string,
    sourceLang: string,
    targetLang: string,
    protectedTerms: string[] = [],
    options: TranslateOptions = {}
): Promise<string> {
    if (!DEEPL_API_KEY) {
        console.error('DEEPL_API_KEY is not configured');
        return text;
    }

    if (!text.trim()) {
        return text;
    }

    try {
        // Merge protected terms from both sources
        const allProtected = [
            ...protectedTerms,
            ...(options.protectedTerms || []),
        ];

        // Wrap protected terms with <keep> tags
        const processedText = wrapProtectedTerms(text, allProtected);
        const useXml = allProtected.length > 0;

        const deeplTarget = toDeepLLanguage(targetLang, true);

        const requestBody: Record<string, unknown> = {
            text: [processedText],
            source_lang: toDeepLLanguage(sourceLang, false),
            target_lang: deeplTarget,
        };

        // A1: Context-aware translation
        if (options.context?.trim()) {
            requestBody.context = options.context.trim();
        }

        // A1: Tag handling for protected terms or HTML preservation
        if (useXml) {
            requestBody.tag_handling = 'xml';
            requestBody.ignore_tags = ['keep'];
        } else if (options.tagHandling === 'html') {
            requestBody.tag_handling = 'html';
        }

        // A2: Formality control
        const formality = options.formality || 'more'; // Default: formal for scientists
        if (formality !== 'default' && supportsFormality(deeplTarget)) {
            requestBody.formality = formality;
        }

        // B2: Glossary integration
        if (options.glossaryId) {
            requestBody.glossary_id = options.glossaryId;
        }

        const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DeepL API error: ${response.status} - ${errorText}`);
            return text;
        }

        const data = await response.json();

        if (data.translations && data.translations.length > 0) {
            const translated = data.translations[0].text;
            return useXml ? unwrapProtectedTerms(translated) : translated;
        }

        return text;
    } catch (error) {
        console.error('DeepL translation error:', error);
        return text;
    }
}

/**
 * Translate multiple texts in a single batch request
 * If sourceLang is omitted, DeepL will auto-detect the source language
 */
export async function translateBatch(
    texts: string[],
    sourceLang: string | undefined,
    targetLang: string,
    options: TranslateOptions = {}
): Promise<string[]> {
    if (!DEEPL_API_KEY) {
        console.error('DEEPL_API_KEY is not configured');
        return texts;
    }

    if (texts.length === 0) {
        return [];
    }

    // Filter out empty strings but keep track of their positions
    const nonEmptyIndices: number[] = [];
    const nonEmptyTexts: string[] = [];

    texts.forEach((text, index) => {
        if (text.trim()) {
            nonEmptyIndices.push(index);
            nonEmptyTexts.push(text);
        }
    });

    if (nonEmptyTexts.length === 0) {
        return texts;
    }

    try {
        const deeplTarget = toDeepLLanguage(targetLang, true);

        const requestBody: Record<string, unknown> = {
            text: nonEmptyTexts,
            target_lang: deeplTarget,
        };

        if (sourceLang) {
            requestBody.source_lang = toDeepLLanguage(sourceLang, false);
        }

        // Context
        if (options.context?.trim()) {
            requestBody.context = options.context.trim();
        }

        // Tag handling
        if (options.tagHandling === 'html') {
            requestBody.tag_handling = 'html';
        }

        // Formality
        const formality = options.formality || 'more';
        if (formality !== 'default' && supportsFormality(deeplTarget)) {
            requestBody.formality = formality;
        }

        // Glossary
        if (options.glossaryId) {
            requestBody.glossary_id = options.glossaryId;
        }

        const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DeepL API error: ${response.status} - ${errorText}`);
            return texts;
        }

        const data = await response.json();

        if (data.translations && data.translations.length === nonEmptyTexts.length) {
            const result = [...texts];
            data.translations.forEach((translation: { text: string }, index: number) => {
                result[nonEmptyIndices[index]] = translation.text;
            });
            return result;
        }

        return texts;
    } catch (error) {
        console.error('DeepL batch translation error:', error);
        return texts;
    }
}

// ─── DeepL Glossary Management API ──────────────────────────────────────────

/**
 * Create or update a DeepL glossary from entries
 * Returns the DeepL glossary ID
 */
export async function syncDeepLGlossary(
    name: string,
    sourceLang: string,
    targetLang: string,
    entries: { source: string; target: string }[]
): Promise<string | null> {
    if (!DEEPL_API_KEY || entries.length === 0) return null;

    try {
        // Build TSV entries
        const entriesTsv = entries
            .map((e) => `${e.source}\t${e.target}`)
            .join('\n');

        const response = await fetch(`${DEEPL_API_URL}/v2/glossaries`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                source_lang: toDeepLLanguage(sourceLang, false),
                target_lang: toDeepLLanguage(targetLang, true),
                entries: entriesTsv,
                entries_format: 'tsv',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DeepL Glossary API error: ${response.status} - ${errorText}`);
            return null;
        }

        const data = await response.json();
        return data.glossary_id || null;
    } catch (error) {
        console.error('DeepL glossary sync error:', error);
        return null;
    }
}

/**
 * Delete a DeepL glossary by ID
 */
export async function deleteDeepLGlossary(glossaryId: string): Promise<boolean> {
    if (!DEEPL_API_KEY) return false;

    try {
        const response = await fetch(
            `${DEEPL_API_URL}/v2/glossaries/${glossaryId}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                },
            }
        );
        return response.ok;
    } catch (error) {
        console.error('DeepL glossary delete error:', error);
        return false;
    }
}

/**
 * Get DeepL API usage stats
 */
export async function getDeepLUsage(): Promise<{
    characterCount: number;
    characterLimit: number;
} | null> {
    if (!DEEPL_API_KEY) return null;

    try {
        const response = await fetch(`${DEEPL_API_URL}/v2/usage`, {
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
            },
        });

        if (!response.ok) return null;

        const data = await response.json();
        return {
            characterCount: data.character_count || 0,
            characterLimit: data.character_limit || 0,
        };
    } catch {
        return null;
    }
}

/**
 * Detect language of a text using DeepL
 * Returns the detected language code in lowercase ISO 639-1 format
 */
export async function detectLanguageViaTranslation(text: string): Promise<string | null> {
    if (!DEEPL_API_KEY) {
        return null;
    }

    if (!text.trim()) {
        return null;
    }

    try {
        const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
            method: 'POST',
            headers: {
                'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: [text.slice(0, 200)],
                target_lang: 'EN-US',
            }),
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        if (data.translations && data.translations.length > 0) {
            const detectedLang = data.translations[0].detected_source_language;
            return detectedLang ? fromDeepLLanguage(detectedLang) : null;
        }

        return null;
    } catch (error) {
        console.error('DeepL language detection error:', error);
        return null;
    }
}
