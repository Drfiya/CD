import type React from 'react';

/**
 * Pure DOM utility functions for the GlobalTranslator.
 *
 * Separated from the React component so the MutationObserver-heavy logic
 * can be tested and reasoned about without any React dependency.
 */

// Attributes that should be translated
export const TRANSLATABLE_ATTRS = [
    'placeholder',
    'title',
    'aria-label',
    'aria-placeholder',
    'aria-description',
    'alt',
] as const;

// Elements that should never be translated
export const SKIP_ELEMENTS = new Set([
    'SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD', 'SAMP', 'VAR',
    'TEXTAREA', 'INPUT', 'NOSCRIPT', 'IFRAME', 'SVG', 'MATH',
]);

// Only DOM subtrees inside this selector are eligible for DeepL translation.
// Chrome strings are served by the static i18n catalogue and must never flow
// through DeepL.
export const UGC_SELECTOR = '[data-translate="ugc"]';

// Skip very short strings — not worth an API call
export const MIN_TEXT_LENGTH = 2;

// Track our own mutations to avoid flicker loops with React reconciliation.
// Module-level so both the observer handler and applyTranslations share it.
export const pendingOurMutations = new WeakSet<Node>();

export interface TranslationTarget {
    type: 'text' | 'attribute';
    node: Node;
    element?: Element;
    attribute?: string;
    originalText: string;
}

/** True if `el` (or any ancestor) is inside an opt-in UGC surface. */
export function isInsideUgc(el: Element | null | undefined): boolean {
    if (!el) return false;
    return el.closest(UGC_SELECTOR) !== null;
}

/** Returns the stored pre-translation text for a node, if any. */
export function getOriginalText(node: Node): string | null {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.parentElement?.getAttribute('data-original-text') ?? null;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).getAttribute('data-original-text');
    }
    return null;
}

/** True if this element (or an ancestor) should never be translated. */
export function shouldSkipElement(element: Element): boolean {
    if (SKIP_ELEMENTS.has(element.tagName)) return true;
    if (element.hasAttribute('data-no-translate') || element.getAttribute('translate') === 'no') return true;
    if (element.classList.contains('notranslate')) return true;
    if (element.getAttribute('contenteditable') === 'true') return true;

    let parent = element.parentElement;
    while (parent) {
        if (
            parent.hasAttribute('data-no-translate') ||
            parent.getAttribute('translate') === 'no' ||
            parent.classList.contains('notranslate') ||
            SKIP_ELEMENTS.has(parent.tagName)
        ) return true;
        parent = parent.parentElement;
    }
    return false;
}

/** True if this text string is worth sending to DeepL. */
export function shouldTranslateText(text: string): boolean {
    const trimmed = text.trim();
    if (trimmed.length < MIN_TEXT_LENGTH) return false;
    if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) return false;
    if (/^https?:\/\//.test(trimmed) || /^www\./.test(trimmed)) return false;
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(trimmed)) return false;
    return true;
}

/**
 * Walk `root` and collect all translatable nodes within UGC surfaces.
 * Pure function — no hooks, no side-effects.
 */
export function extractTargets(
    root: Node,
    currentLanguage: string,
    translatedNodesMap: WeakMap<Node, string>,
): TranslationTarget[] {
    const targets: TranslationTarget[] = [];

    const rootElement = root.nodeType === Node.ELEMENT_NODE
        ? root as Element
        : (root as Node).parentElement;
    if (rootElement && shouldSkipElement(rootElement)) return targets;

    const rootIsElement = root.nodeType === Node.ELEMENT_NODE;
    const rootContainer = rootIsElement ? (root as Element) : rootElement;
    const rootInsideUgc = isInsideUgc(rootContainer ?? null);
    const hasUgcDescendant = rootIsElement
        ? (root as Element).querySelector(UGC_SELECTOR) !== null
        : false;
    if (!rootInsideUgc && !hasUgcDescendant) return targets;

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
            acceptNode: (node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    return shouldSkipElement(node as Element)
                        ? NodeFilter.FILTER_REJECT
                        : NodeFilter.FILTER_ACCEPT;
                }
                if (node.nodeType === Node.TEXT_NODE && !isInsideUgc(node.parentElement)) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            },
        },
    );

    let node: Node | null;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            if (shouldTranslateText(text)) {
                if (translatedNodesMap.get(node) === currentLanguage) continue;
                targets.push({ type: 'text', node, originalText: getOriginalText(node) || text });
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (!isInsideUgc(element)) continue;

            for (const attr of TRANSLATABLE_ATTRS) {
                const value = element.getAttribute(attr);
                if (value && shouldTranslateText(value)) {
                    const original = element.getAttribute(`data-original-${attr}`) || value;
                    targets.push({ type: 'attribute', node, element, attribute: attr, originalText: original });
                }
            }

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
}

/** Revert all translated DOM nodes back to original text. Clears all state. */
export function revertDomTranslations(): void {
    document.querySelectorAll('[data-original-text]').forEach(element => {
        const original = element.getAttribute('data-original-text');
        if (original && element.textContent !== original) {
            pendingOurMutations.add(element.firstChild || element);
            element.textContent = original;
        }
        element.removeAttribute('data-original-text');
        element.classList.remove('translated');
    });

    TRANSLATABLE_ATTRS.forEach(attr => {
        document.querySelectorAll(`[data-original-${attr}]`).forEach(element => {
            const original = element.getAttribute(`data-original-${attr}`);
            if (original) {
                element.setAttribute(attr, original);
                element.removeAttribute(`data-original-${attr}`);
            }
        });
    });
}

/**
 * Reset DOM nodes to original text for re-translation.
 * Keeps data-original-* attributes so re-translation can use them.
 * Clears the translatedNodesMap so a fresh full scan runs.
 */
export function resetDomForRetranslation(
    translatedNodesRef: React.MutableRefObject<WeakMap<Node, string>>,
): void {
    translatedNodesRef.current = new WeakMap<Node, string>();

    document.querySelectorAll('[data-original-text]').forEach(element => {
        const original = element.getAttribute('data-original-text');
        if (original && element.textContent !== original) {
            pendingOurMutations.add(element.firstChild || element);
            element.textContent = original;
        }
        element.classList.remove('translated');
    });

    TRANSLATABLE_ATTRS.forEach(attr => {
        document.querySelectorAll(`[data-original-${attr}]`).forEach(element => {
            const original = element.getAttribute(`data-original-${attr}`);
            if (original) element.setAttribute(attr, original);
        });
    });
}
