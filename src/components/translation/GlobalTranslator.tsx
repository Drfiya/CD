'use client';

/**
 * Global DOM Translator
 * 
 * Uses MutationObserver to intercept all rendered text and translate it via DeepL.
 * 
 * KEY FEATURES:
 * - Translates all text nodes and HTML attributes (placeholder, title, aria-label, alt)
 * - React reconciliation safety via mutation tracking
 * - Debounced batch processing (50ms window, max 50 texts per batch)
 * - Route change detection for Next.js persistent layouts
 * 
 * CONTENT EXCLUSIONS (data-no-translate):
 * Use the data-no-translate attribute to skip translation for:
 * - Usernames: <span data-no-translate>@johndoe</span>
 * - URLs: <a href="..." data-no-translate>https://example.com</a>
 * - Code: <code data-no-translate>const x = 42;</code>
 * - Brand names: <span data-no-translate>OpenAI</span>
 * 
 * Automatically skipped elements:
 * - <script>, <style>, <code>, <pre>, <kbd>, <samp>, <var>, <textarea>, <input>
 * - Elements with contenteditable="true"
 * - Elements with class "notranslate"
 */

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from './TranslationContext';
import { translateBatch } from '@/lib/translation/client/deepl-client';
import { getFromCache } from '@/lib/translation/client/cache-client';

// Attributes that should be translated
const TRANSLATABLE_ATTRS = [
    'placeholder',
    'title',
    'aria-label',
    'aria-placeholder',
    'aria-description',
    'alt'
] as const;

// Elements that should never be translated
const SKIP_ELEMENTS = new Set([
    'SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
    'TEXTAREA', 'INPUT', 'NOSCRIPT', 'IFRAME', 'SVG', 'MATH'
]);

// Minimum text length to translate (skip very short strings)
const MIN_TEXT_LENGTH = 2;

// Track our own mutations to avoid flicker loops with React reconciliation
const pendingOurMutations = new WeakSet<Node>();

// NOTE: translatedNodes is now component-scoped (see translatedNodesRef in GlobalTranslator)

interface TranslationTarget {
    type: 'text' | 'attribute';
    node: Node;
    element?: Element;
    attribute?: string;
    originalText: string;
}

export function GlobalTranslator() {
    const { currentLanguage, translationVersion, setIsTranslating } = useTranslation();
    const pathname = usePathname();

    const observerRef = useRef<MutationObserver | null>(null);
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingTargetsRef = useRef<TranslationTarget[]>([]);
    const isProcessingRef = useRef(false);

    // Track which nodes have been translated to which language (component-scoped)
    const translatedNodesRef = useRef(new WeakMap<Node, string>());

    /**
     * Check if an element should be skipped
     */
    const shouldSkipElement = useCallback((element: Element): boolean => {
        // Skip by tag name
        if (SKIP_ELEMENTS.has(element.tagName)) {
            return true;
        }

        // Skip elements marked with data-no-translate or translate="no" (HTML standard)
        if (element.hasAttribute('data-no-translate') || element.getAttribute('translate') === 'no') {
            return true;
        }

        // Skip elements with notranslate class (Google convention)
        if (element.classList.contains('notranslate')) {
            return true;
        }

        // Skip contenteditable elements (user is typing)
        if (element.getAttribute('contenteditable') === 'true') {
            return true;
        }

        // Check ancestors for data-no-translate / translate="no"
        let parent = element.parentElement;
        while (parent) {
            if (parent.hasAttribute('data-no-translate') ||
                parent.getAttribute('translate') === 'no' ||
                parent.classList.contains('notranslate') ||
                SKIP_ELEMENTS.has(parent.tagName)) {
                return true;
            }
            parent = parent.parentElement;
        }

        return false;
    }, []);

    /**
     * Check if text should be translated
     */
    const shouldTranslateText = useCallback((text: string): boolean => {
        const trimmed = text.trim();

        // Skip empty or very short text
        if (trimmed.length < MIN_TEXT_LENGTH) {
            return false;
        }

        // Skip if it's just numbers, punctuation, or symbols
        if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) {
            return false;
        }

        // Skip if it looks like a URL
        if (/^https?:\/\//.test(trimmed) || /^www\./.test(trimmed)) {
            return false;
        }

        // Skip if it looks like an email
        if (/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) {
            return false;
        }

        return true;
    }, []);

    /**
     * Extract all translatable targets from the DOM
     */
    const extractTargets = useCallback((root: Node): TranslationTarget[] => {
        const targets: TranslationTarget[] = [];

        // CRITICAL: TreeWalker never calls acceptNode on the root itself,
        // so if the root is inside a data-no-translate container, its children
        // would bypass the filter. Check the root and its ancestors first.
        const rootElement = root.nodeType === Node.ELEMENT_NODE
            ? root as Element
            : (root as Node).parentElement;
        if (rootElement && shouldSkipElement(rootElement)) {
            return targets; // Entire subtree is protected
        }

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            {
                acceptNode: (node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        if (shouldSkipElement(element)) {
                            return NodeFilter.FILTER_REJECT; // Skip this subtree
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        let node: Node | null;
        while ((node = walker.nextNode())) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                if (shouldTranslateText(text)) {
                    // Check if already translated to current language
                    if (translatedNodesRef.current.get(node) === currentLanguage) {
                        continue;
                    }
                    targets.push({
                        type: 'text',
                        node,
                        originalText: getOriginalText(node) || text,
                    });
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;

                // Check translatable attributes
                for (const attr of TRANSLATABLE_ATTRS) {
                    const value = element.getAttribute(attr);
                    if (value && shouldTranslateText(value)) {
                        const originalAttr = `data-original-${attr}`;
                        const original = element.getAttribute(originalAttr) || value;
                        targets.push({
                            type: 'attribute',
                            node,
                            element,
                            attribute: attr,
                            originalText: original,
                        });
                    }
                }

                // Check option elements specifically
                if (element.tagName === 'OPTION') {
                    const text = element.textContent || '';
                    if (shouldTranslateText(text)) {
                        targets.push({
                            type: 'text',
                            node: element.firstChild || element,
                            element,
                            originalText: getOriginalText(element) || text,
                        });
                    }
                }
            }
        }

        return targets;
    }, [shouldSkipElement, shouldTranslateText, currentLanguage]);

    /**
     * Get original text (before translation)
     */
    function getOriginalText(node: Node): string | null {
        if (node.nodeType === Node.TEXT_NODE) {
            const parent = node.parentElement;
            return parent?.getAttribute('data-original-text') || null;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            return (node as Element).getAttribute('data-original-text');
        }
        return null;
    }

    /**
     * Apply translations to the DOM
     */
    const applyTranslations = useCallback(async (targets: TranslationTarget[]) => {
        console.log('[GlobalTranslator] applyTranslations called with', targets.length, 'targets');
        if (targets.length === 0) {
            console.log('[GlobalTranslator] Skipping applyTranslations - empty');
            return;
        }

        setIsTranslating(true);

        try {
            // Group targets and get unique texts
            const uniqueTexts = [...new Set(targets.map(t => t.originalText))];
            console.log('[GlobalTranslator] Translating', uniqueTexts.length, 'unique texts to', currentLanguage);

            // Translate in batches - use auto-detect for source language
            // This is necessary because server may render in any language depending on user preference
            const translations = await translateBatch(uniqueTexts, currentLanguage);
            console.log('[GlobalTranslator] Got', translations.length, 'translations back');

            // Create lookup map
            const translationMap = new Map<string, string>();
            uniqueTexts.forEach((text, i) => {
                translationMap.set(text, translations[i]);
            });

            // Apply translations to DOM
            targets.forEach(target => {
                const translation = translationMap.get(target.originalText);
                if (!translation || translation === target.originalText) {
                    return;
                }

                if (target.type === 'text') {
                    const textNode = target.node;
                    const parent = textNode.parentElement;

                    // Store original text
                    if (parent && !parent.hasAttribute('data-original-text')) {
                        parent.setAttribute('data-original-text', target.originalText);
                    }

                    // Mark as our mutation to avoid observer loop
                    pendingOurMutations.add(textNode);
                    textNode.textContent = translation;
                    translatedNodesRef.current.set(textNode, currentLanguage);

                    // Add subtle visual feedback
                    if (parent) {
                        parent.classList.add('translated');
                    }
                } else if (target.type === 'attribute' && target.element && target.attribute) {
                    // Store original attribute
                    const originalAttr = `data-original-${target.attribute}`;
                    if (!target.element.hasAttribute(originalAttr)) {
                        target.element.setAttribute(originalAttr, target.originalText);
                    }

                    target.element.setAttribute(target.attribute, translation);
                }
            });
        } catch (error) {
            console.error('Translation error:', error);
        } finally {
            setIsTranslating(false);
        }
    }, [currentLanguage, setIsTranslating]);

    /**
     * Process pending targets (debounced)
     */
    const processPendingTargets = useCallback(() => {
        if (isProcessingRef.current || pendingTargetsRef.current.length === 0) {
            return;
        }

        isProcessingRef.current = true;
        const targets = [...pendingTargetsRef.current];
        pendingTargetsRef.current = [];

        applyTranslations(targets).finally(() => {
            isProcessingRef.current = false;

            // Check if more targets accumulated during processing
            if (pendingTargetsRef.current.length > 0) {
                debounceTimeoutRef.current = setTimeout(processPendingTargets, 10);
            }
        });
    }, [applyTranslations]);

    /**
     * Schedule processing of new targets (immediate = skip debounce)
     */
    const scheduleTranslation = useCallback((targets: TranslationTarget[], immediate = false) => {
        pendingTargetsRef.current.push(...targets);

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Immediate mode for language switches, short delay for mutation handling
        const delay = immediate ? 0 : 10;
        debounceTimeoutRef.current = setTimeout(processPendingTargets, delay);
    }, [processPendingTargets]);

    /**
     * Handle mutations from MutationObserver
     */
    const handleMutations = useCallback((mutations: MutationRecord[]) => {
        const targets: TranslationTarget[] = [];

        for (const mutation of mutations) {
            // Skip our own mutations
            if (pendingOurMutations.has(mutation.target)) {
                pendingOurMutations.delete(mutation.target);
                continue;
            }

            if (mutation.type === 'childList') {
                // New nodes added
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        targets.push(...extractTargets(node));
                    }
                });
            } else if (mutation.type === 'characterData') {
                // Text content changed
                const node = mutation.target;
                const text = node.textContent || '';

                // Skip nodes inside data-no-translate containers
                // (e.g. server-translated post content, Original toggle view)
                const parentEl = node.parentElement;
                if (parentEl && shouldSkipElement(parentEl)) {
                    continue;
                }

                // Check if React restored original text
                const original = getOriginalText(node);
                if (original && text === original) {
                    // React restored original, re-apply translation from cache
                    const cached = getFromCache(original, currentLanguage);
                    if (cached) {
                        pendingOurMutations.add(node);
                        node.textContent = cached;
                        translatedNodesRef.current.set(node, currentLanguage);
                    }
                } else if (shouldTranslateText(text)) {
                    targets.push({
                        type: 'text',
                        node,
                        originalText: text,
                    });
                }
            } else if (mutation.type === 'attributes') {
                const element = mutation.target as Element;
                const attr = mutation.attributeName;

                // Skip elements inside data-no-translate containers
                if (shouldSkipElement(element)) {
                    continue;
                }

                if (attr && TRANSLATABLE_ATTRS.includes(attr as typeof TRANSLATABLE_ATTRS[number])) {
                    const value = element.getAttribute(attr);
                    if (value && shouldTranslateText(value)) {
                        targets.push({
                            type: 'attribute',
                            node: element,
                            element,
                            attribute: attr,
                            originalText: value,
                        });
                    }
                }
            }
        }

        if (targets.length > 0) {
            scheduleTranslation(targets);
        }
    }, [extractTargets, currentLanguage, shouldTranslateText, scheduleTranslation]);

    /**
     * Full page scan - translates all existing content
     */
    const scanFullPage = useCallback(() => {
        console.log('[GlobalTranslator] scanFullPage called, currentLanguage:', currentLanguage);

        const targets = extractTargets(document.body);
        console.log('[GlobalTranslator] Found', targets.length, 'targets to translate');
        if (targets.length > 0) {
            console.log('[GlobalTranslator] Sample targets:', targets.slice(0, 3).map(t => ({ type: t.type, text: t.originalText.substring(0, 50) })));
            // Use immediate mode for full page scans (language switches)
            scheduleTranslation(targets, true);
        } else {
            console.log('[GlobalTranslator] No targets found!');
        }
    }, [currentLanguage, extractTargets, scheduleTranslation]);

    /**
     * Revert all translations back to original English
     * This completely clears all translation state
     */
    const revertTranslations = useCallback(() => {
        // Revert text nodes
        document.querySelectorAll('[data-original-text]').forEach(element => {
            const original = element.getAttribute('data-original-text');
            if (original && element.textContent !== original) {
                pendingOurMutations.add(element.firstChild || element);
                element.textContent = original;
            }
            element.removeAttribute('data-original-text');
            element.classList.remove('translated');
        });

        // Revert attributes
        TRANSLATABLE_ATTRS.forEach(attr => {
            document.querySelectorAll(`[data-original-${attr}]`).forEach(element => {
                const original = element.getAttribute(`data-original-${attr}`);
                if (original) {
                    element.setAttribute(attr, original);
                    element.removeAttribute(`data-original-${attr}`);
                }
            });
        });
    }, []);

    /**
     * Reset DOM to original text for re-translation
     * Keeps the data-original-text attributes so we can use them for re-translation
     */
    const resetToOriginalForRetranslation = useCallback(() => {
        // Clear translation tracking to ensure full re-scan
        // This is critical to avoid stale entries causing incomplete translations
        translatedNodesRef.current = new WeakMap<Node, string>();

        // Reset text nodes to original but KEEP the data-original-text attribute
        document.querySelectorAll('[data-original-text]').forEach(element => {
            const original = element.getAttribute('data-original-text');
            if (original && element.textContent !== original) {
                pendingOurMutations.add(element.firstChild || element);
                element.textContent = original;
            }
            element.classList.remove('translated');
        });

        // Reset attributes but keep the data-original-* attributes
        TRANSLATABLE_ATTRS.forEach(attr => {
            document.querySelectorAll(`[data-original-${attr}]`).forEach(element => {
                const original = element.getAttribute(`data-original-${attr}`);
                if (original) {
                    element.setAttribute(attr, original);
                }
            });
        });
    }, []);

    // Set up MutationObserver
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
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [handleMutations]);

    // Track previous language to detect language-to-language switches
    const previousLanguageRef = useRef<string>(currentLanguage);
    // Track if this is the initial mount
    const isInitialMountRef = useRef(true);

    // Handle language changes
    useEffect(() => {
        const previousLanguage = previousLanguageRef.current;
        const isInitialMount = isInitialMountRef.current;

        // Update refs
        previousLanguageRef.current = currentLanguage;
        isInitialMountRef.current = false;

        console.log('[GlobalTranslator] Language effect triggered', {
            previousLanguage,
            currentLanguage,
            isInitialMount
        });

        if (currentLanguage === 'en') {
            // English is selected — still scan for non-English text that needs translation
            if (!isInitialMount && previousLanguage !== 'en') {
                // Was in another language before, revert those translations first
                revertTranslations();
            }
            // Scan for any non-English text to translate to English
            requestAnimationFrame(() => {
                scanFullPage();
                setTimeout(() => {
                    scanFullPage();
                }, 200);
            });
        } else if (isInitialMount) {
            // Initial mount with non-English language - use multi-stage scan for reliability
            console.log('[GlobalTranslator] Initial mount, starting multi-stage scan for', currentLanguage);
            // First scan after next paint
            requestAnimationFrame(() => {
                scanFullPage();
                // Second scan after a short delay to catch any late-rendered content
                setTimeout(() => {
                    console.log('[GlobalTranslator] Running follow-up scan');
                    scanFullPage();
                }, 200);
            });
        } else if (previousLanguage !== currentLanguage) {
            // Language changed
            if (previousLanguage !== 'en') {
                // Switching from one non-English language to another
                console.log('[GlobalTranslator] Language switch:', previousLanguage, '->', currentLanguage);
                resetToOriginalForRetranslation();
                // Delay to let DOM settle, then scan for translation
                setTimeout(() => {
                    scanFullPage();
                }, 50);
            } else {
                // Switching FROM English to another language
                console.log('[GlobalTranslator] English -> ', currentLanguage);
                scanFullPage();
            }
        }
        // If previousLanguage === currentLanguage and not initial mount, this is a re-render, skip
    }, [currentLanguage, translationVersion, revertTranslations, resetToOriginalForRetranslation, scanFullPage]);

    // Re-scan on route changes (for persistent layouts)
    useEffect(() => {
        // Small delay to let new page content render
        const timeout = setTimeout(() => {
            scanFullPage();
        }, 100);

        return () => clearTimeout(timeout);
    }, [pathname, currentLanguage, scanFullPage]);

    // This component doesn't render anything visible
    return null;
}
