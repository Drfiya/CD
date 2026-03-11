'use client';

/**
 * ConfidenceIndicator (F1) — Translation Confidence Badge
 *
 * A small inline indicator shown next to translated content to communicate
 * the confidence level of the machine translation.
 *
 * - high:   Nothing rendered (returns null) — no visual noise for good translations.
 * - medium: Subtle italic text "Machine translated" in muted gray.
 * - low:    Slightly more visible amber/warning text with a small warning icon
 *           and text "Machine translated – review original recommended".
 *
 * When `showTruthHighlight` is true the component adds a pulsing ring around
 * the nearest TruthToggle wrapper via a CSS class, drawing the reader's
 * attention to the "Show original" button.
 */

import { useEffect } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfidenceIndicatorProps {
    /** Translation confidence level */
    level: 'high' | 'medium' | 'low';
    /** User-facing label — null for high confidence */
    label: string | null;
    /** Whether to visually highlight the Truth toggle for low confidence */
    showTruthHighlight: boolean;
}

// ─── Warning Icon (inline SVG) ───────────────────────────────────────────────

function WarningIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
            />
        </svg>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConfidenceIndicator({
    level,
    label,
    showTruthHighlight,
}: ConfidenceIndicatorProps) {
    // When showTruthHighlight is active, find the closest truth-toggle-wrapper
    // ancestor and add a highlight class to draw attention to the "Show original"
    // button.  The class is cleaned up on unmount or when the flag changes.
    useEffect(() => {
        if (!showTruthHighlight) return;

        // Find the nearest truth-toggle-wrapper from any indicator on the page.
        // We scope this via a data attribute set on our own root element.
        const indicator = document.querySelector('[data-confidence-low="true"]');
        const wrapper = indicator?.closest('.truth-toggle-wrapper');

        if (wrapper) {
            wrapper.classList.add('truth-toggle-highlight');
        }

        return () => {
            if (wrapper) {
                wrapper.classList.remove('truth-toggle-highlight');
            }
        };
    }, [showTruthHighlight]);

    // ─── High confidence: render nothing ─────────────────────────────────────
    if (level === 'high') {
        return null;
    }

    // ─── Medium confidence ───────────────────────────────────────────────────
    if (level === 'medium') {
        return (
            <span
                className="text-[10px] text-gray-400 dark:text-neutral-500 italic select-none"
                role="status"
                aria-label={label ?? 'Machine translated'}
            >
                {label ?? 'Machine translated'}
            </span>
        );
    }

    // ─── Low confidence ──────────────────────────────────────────────────────
    return (
        <span
            className="inline-flex items-center gap-0.5 text-[10px] text-amber-500 dark:text-amber-400 italic font-medium select-none"
            role="status"
            aria-label={label ?? 'Machine translated \u2013 review original recommended'}
            data-confidence-low="true"
        >
            <WarningIcon className="w-3 h-3 shrink-0" />
            {label ?? 'Machine translated \u2013 review original recommended'}
        </span>
    );
}
