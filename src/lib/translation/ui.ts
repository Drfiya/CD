/**
 * Dynamic UI Text Translation
 * 
 * Translates UI strings (like category names, placeholders, etc.)
 * using DeepL, with caching to minimize API calls.
 */

import { translateForUser } from './index';

/**
 * Translate a single UI text string
 * Uses the Translation cache with entityType 'UI' for efficiency
 */
export async function translateUIText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'general'
): Promise<string> {
    // Skip if same language or empty
    if (sourceLanguage === targetLanguage || !text || !text.trim()) {
        return text;
    }

    return translateForUser({
        entityType: 'UI',
        entityId: context, // e.g., 'category', 'placeholder', 'button'
        fieldName: text.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
        content: text,
        sourceLanguage,
        targetLanguage,
    });
}

/**
 * Translate multiple UI text strings in parallel
 */
export async function translateUITexts(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'general'
): Promise<string[]> {
    if (sourceLanguage === targetLanguage) {
        return texts;
    }

    return Promise.all(
        texts.map(text => translateUIText(text, sourceLanguage, targetLanguage, context))
    );
}

/**
 * Translate an object's string values
 * Useful for translating category objects, etc.
 */
export async function translateObject<T extends object>(
    obj: T,
    fieldsToTranslate: (keyof T)[],
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'general'
): Promise<T> {
    if (sourceLanguage === targetLanguage) {
        return obj;
    }

    const translatedObj = { ...obj };

    for (const field of fieldsToTranslate) {
        const value = obj[field];
        if (typeof value === 'string' && value.trim()) {
            (translatedObj as Record<string, unknown>)[field as string] = await translateUIText(
                value,
                sourceLanguage,
                targetLanguage,
                context
            );
        }
    }

    return translatedObj;
}

/**
 * Translate an array of objects
 */
export async function translateObjects<T extends object>(
    objects: T[],
    fieldsToTranslate: (keyof T)[],
    sourceLanguage: string,
    targetLanguage: string,
    context: string = 'general'
): Promise<T[]> {
    if (sourceLanguage === targetLanguage) {
        return objects;
    }

    return Promise.all(
        objects.map(obj => translateObject(obj, fieldsToTranslate, sourceLanguage, targetLanguage, context))
    );
}
