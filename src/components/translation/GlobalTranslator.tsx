'use client';
/**
 * Global DOM Translator — UGC-scoped opt-in allow-list.
 * Only `[data-translate="ugc"]` subtrees go through DeepL.
 * Chrome strings (nav, buttons, toasts) use the static i18n catalogue.
 * DOM utilities live in ./dom-utils.ts (pure, no React).
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from './TranslationContext';
import { translateBatch } from '@/lib/translation/client/deepl-client';
import { getFromCache } from '@/lib/translation/client/cache-client';
import {
    TRANSLATABLE_ATTRS,
    pendingOurMutations,
    extractTargets,
    isInsideUgc,
    shouldSkipElement,
    shouldTranslateText,
    getOriginalText,
    revertDomTranslations,
    resetDomForRetranslation,
    type TranslationTarget,
} from './dom-utils';

const decodeHtml = (text: string) => {
    if (!text || !text.includes('&')) return text;
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
};

export function GlobalTranslator() {
    const { currentLanguage, translationVersion, setIsTranslating } = useTranslation();
    const pathname = usePathname();

    const observerRef = useRef<MutationObserver | null>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTargetsRef = useRef<TranslationTarget[]>([]);
    const isProcessingRef = useRef(false);
    const translatedNodesRef = useRef(new WeakMap<Node, string>());

    const applyTranslations = useCallback(async (targets: TranslationTarget[]) => {
        if (targets.length === 0) return;

        setIsTranslating(true);

        try {
            const uniqueTexts = [...new Set(targets.map(t => t.originalText))];
            const translations = await translateBatch(uniqueTexts, currentLanguage);

            const translationMap = new Map<string, string>();
            uniqueTexts.forEach((text, i) => { translationMap.set(text, translations[i]); });

            targets.forEach(target => {
                const translation = translationMap.get(target.originalText);
                if (!translation || translation === target.originalText) return;

                if (target.type === 'text') {
                    const parent = target.node.parentElement;
                    if (parent && !parent.hasAttribute('data-original-text')) {
                        parent.setAttribute('data-original-text', target.originalText);
                    }
                    pendingOurMutations.add(target.node);
                    target.node.textContent = decodeHtml(translation);
                    translatedNodesRef.current.set(target.node, currentLanguage);
                    if (parent) parent.classList.add('translated');
                } else if (target.type === 'attribute' && target.element && target.attribute) {
                    const originalAttr = `data-original-${target.attribute}`;
                    if (!target.element.hasAttribute(originalAttr)) {
                        target.element.setAttribute(originalAttr, target.originalText);
                    }
                    target.element.setAttribute(target.attribute, decodeHtml(translation));
                }
            });
        } catch (error) {
            console.error('Translation error:', error);
        } finally {
            setIsTranslating(false);
        }
    }, [currentLanguage, setIsTranslating]);

    const processPendingTargets = useCallback(() => {
        if (isProcessingRef.current || pendingTargetsRef.current.length === 0) return;

        isProcessingRef.current = true;
        const targets = [...pendingTargetsRef.current];
        pendingTargetsRef.current = [];

        applyTranslations(targets).finally(() => {
            isProcessingRef.current = false;
            if (pendingTargetsRef.current.length > 0) {
                debounceTimeoutRef.current = setTimeout(processPendingTargets, 10);
            }
        });
    }, [applyTranslations]);

    const scheduleTranslation = useCallback((targets: TranslationTarget[], immediate = false) => {
        pendingTargetsRef.current.push(...targets);
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(processPendingTargets, immediate ? 0 : 10);
    }, [processPendingTargets]);

    const handleMutations = useCallback((mutations: MutationRecord[]) => {
        const targets: TranslationTarget[] = [];

        for (const mutation of mutations) {
            if (pendingOurMutations.has(mutation.target)) {
                pendingOurMutations.delete(mutation.target);
                continue;
            }

            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        targets.push(...extractTargets(node, currentLanguage, translatedNodesRef.current));
                    }
                });
            } else if (mutation.type === 'characterData') {
                const node = mutation.target;
                const text = node.textContent || '';
                const parentEl = node.parentElement;
                if (parentEl && shouldSkipElement(parentEl)) continue;
                if (!isInsideUgc(parentEl)) continue;

                const original = getOriginalText(node);
                if (original && text === original) {
                    const cached = getFromCache(original, currentLanguage);
                    if (cached) {
                        pendingOurMutations.add(node);
                        node.textContent = decodeHtml(cached);
                        translatedNodesRef.current.set(node, currentLanguage);
                    }
                } else if (shouldTranslateText(text)) {
                    targets.push({ type: 'text', node, originalText: text });
                }
            } else if (mutation.type === 'attributes') {
                const element = mutation.target as Element;
                const attr = mutation.attributeName;
                if (shouldSkipElement(element)) continue;
                if (!isInsideUgc(element)) continue;
                if (attr && TRANSLATABLE_ATTRS.includes(attr as typeof TRANSLATABLE_ATTRS[number])) {
                    const value = element.getAttribute(attr);
                    if (value && shouldTranslateText(value)) {
                        targets.push({ type: 'attribute', node: element, element, attribute: attr, originalText: value });
                    }
                }
            }
        }

        if (targets.length > 0) scheduleTranslation(targets);
    }, [currentLanguage, scheduleTranslation]);

    const scanFullPage = useCallback(() => {
        const targets = extractTargets(document.body, currentLanguage, translatedNodesRef.current);
        if (targets.length > 0) scheduleTranslation(targets, true);
    }, [currentLanguage, scheduleTranslation]);

    useEffect(() => {
        observerRef.current = new MutationObserver(handleMutations);
        observerRef.current.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: [...TRANSLATABLE_ATTRS],
        });
        return () => {
            observerRef.current?.disconnect();
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        };
    }, [handleMutations]);

    const previousLanguageRef = useRef<string>(currentLanguage);
    const isInitialMountRef = useRef(true);

    useEffect(() => {
        const previousLanguage = previousLanguageRef.current;
        const isInitialMount = isInitialMountRef.current;
        previousLanguageRef.current = currentLanguage;
        isInitialMountRef.current = false;

        if (currentLanguage === 'en') {
            if (!isInitialMount && previousLanguage !== 'en') revertDomTranslations();
            requestAnimationFrame(() => { scanFullPage(); setTimeout(scanFullPage, 200); });
        } else if (isInitialMount) {
            // Multi-stage scan catches late-rendered SSR content
            requestAnimationFrame(() => { scanFullPage(); setTimeout(scanFullPage, 200); });
        } else if (previousLanguage !== currentLanguage) {
            if (previousLanguage !== 'en') {
                resetDomForRetranslation(translatedNodesRef);
                setTimeout(scanFullPage, 50);
            } else {
                scanFullPage();
            }
        }
    }, [currentLanguage, translationVersion, scanFullPage]);

    useEffect(() => { // re-scan on route change
        const timeout = setTimeout(scanFullPage, 100);
        return () => clearTimeout(timeout);
    }, [pathname, currentLanguage, scanFullPage]);

    return null;
}
