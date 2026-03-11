'use client';

/**
 * TranslationFeedbackButton (F2) - Community Correction System
 *
 * A subtle "Suggest improvement" button placed next to translated content.
 * Clicking opens an inline editor showing original and current translation
 * side by side, where the user can edit the translation and submit a
 * correction. Submissions create a TranslationFeedback entry via a
 * server action and display a toast notification on success.
 */

import { useState, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import { submitTranslationFeedback } from '@/lib/translation/feedback-actions';
import {
    getLanguageInfo,
} from '@/lib/translation/client/language-codes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TranslationFeedbackButtonProps {
    /** Post ID if the feedback is about a post translation */
    postId?: string;
    /** Comment ID if the feedback is about a comment translation */
    commentId?: string;
    /** The original text in the source language */
    originalText: string;
    /** The current machine translation */
    translatedText: string;
    /** ISO 639-1 code of the source language */
    sourceLocale: string;
    /** ISO 639-1 code of the target language */
    targetLocale: string;
}

// ─── Feedback types ──────────────────────────────────────────────────────────

const FEEDBACK_TYPES = [
    { value: 'incorrect_term', label: 'Incorrect Term' },
    { value: 'wrong_context', label: 'Wrong Context' },
    { value: 'grammar', label: 'Grammar' },
    { value: 'missing_nuance', label: 'Missing Nuance' },
    { value: 'other', label: 'Other' },
] as const;

type FeedbackType = (typeof FEEDBACK_TYPES)[number]['value'];

// ─── Pencil / Edit Icon ──────────────────────────────────────────────────────

function PencilIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className={className}
            aria-hidden="true"
        >
            <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L3.22 10.306a1 1 0 0 0-.258.41l-.97 2.908a.5.5 0 0 0 .632.633l2.908-.97a1 1 0 0 0 .41-.258l7.793-7.793a1.75 1.75 0 0 0 0-2.475l-.247-.248ZM11.72 3.22a.25.25 0 0 1 .354 0l.247.247a.25.25 0 0 1 0 .354L5.063 11.08l-1.585.528.529-1.585L11.72 3.22Z" />
        </svg>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TranslationFeedbackButton({
    postId,
    commentId,
    originalText,
    translatedText,
    sourceLocale,
    targetLocale,
}: TranslationFeedbackButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [suggestedCorrection, setSuggestedCorrection] = useState(translatedText);
    const [feedbackType, setFeedbackType] = useState<FeedbackType>('incorrect_term');
    const [isPending, startTransition] = useTransition();

    // Resolve language display names
    const sourceInfo = getLanguageInfo(sourceLocale);
    const targetInfo = getLanguageInfo(targetLocale);
    const sourceName = sourceInfo ? sourceInfo.name : sourceLocale.toUpperCase();
    const targetName = targetInfo ? targetInfo.name : targetLocale.toUpperCase();

    /**
     * Open the editor and reset form state
     */
    const handleOpen = useCallback(() => {
        setSuggestedCorrection(translatedText);
        setFeedbackType('incorrect_term');
        setIsOpen(true);
    }, [translatedText]);

    /**
     * Close the editor
     */
    const handleClose = useCallback(() => {
        setIsOpen(false);
    }, []);

    /**
     * Submit the feedback via the server action
     */
    const handleSubmit = useCallback(() => {
        if (!suggestedCorrection.trim()) {
            toast.error('Please enter a suggested correction.');
            return;
        }

        // Don't submit if nothing changed
        if (suggestedCorrection.trim() === translatedText.trim()) {
            toast.error('The correction is the same as the current translation.');
            return;
        }

        startTransition(async () => {
            try {
                await submitTranslationFeedback({
                    postId,
                    commentId,
                    originalText,
                    translatedText,
                    suggestedCorrection: suggestedCorrection.trim(),
                    sourceLocale,
                    targetLocale,
                    feedbackType,
                });

                toast.success('Thank you! Your suggestion has been submitted for review.');
                setIsOpen(false);
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Failed to submit feedback. Please try again.'
                );
            }
        });
    }, [
        suggestedCorrection,
        translatedText,
        postId,
        commentId,
        originalText,
        sourceLocale,
        targetLocale,
        feedbackType,
    ]);

    // ─── Collapsed: subtle trigger button ────────────────────────────────────

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={handleOpen}
                className="inline-flex items-center gap-1 text-gray-300 dark:text-neutral-600 hover:text-gray-500 dark:hover:text-neutral-400 text-xs transition-colors"
                title="Suggest a translation improvement"
                aria-label="Suggest a translation improvement"
            >
                <PencilIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Suggest improvement</span>
            </button>
        );
    }

    // ─── Expanded: inline correction editor ──────────────────────────────────

    return (
        <div className="mt-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/60">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                    Suggest Translation Improvement
                </h4>
                <button
                    type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                    aria-label="Close feedback editor"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-4 h-4"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18 18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            {/* Feedback type selector (pills) */}
            <div className="px-4 pt-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-2">
                    Issue Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TYPES.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            onClick={() => setFeedbackType(type.value)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                feedbackType === type.value
                                    ? 'bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Side-by-side panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-neutral-700 p-4 gap-4 md:gap-0">
                {/* ─── Left: Original text (read-only) ─────────────── */}
                <div className="md:pr-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5">
                        Original ({sourceName})
                    </label>
                    <div className="text-sm text-gray-800 dark:text-neutral-200 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words min-h-[80px]">
                        {originalText}
                    </div>

                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5 mt-3">
                        Current Translation ({targetName})
                    </label>
                    <div className="text-sm text-gray-600 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words min-h-[60px] border border-dashed border-gray-200 dark:border-neutral-600">
                        {translatedText}
                    </div>
                </div>

                {/* ─── Right: Editable correction ──────────────────── */}
                <div className="md:pl-4">
                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1.5">
                        Your Suggested Correction ({targetName})
                    </label>
                    <textarea
                        value={suggestedCorrection}
                        onChange={(e) => setSuggestedCorrection(e.target.value)}
                        rows={6}
                        disabled={isPending}
                        placeholder="Edit the translation to improve it..."
                        className="w-full text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 p-3 outline-none focus:border-gray-400 dark:focus:border-neutral-400 resize-none disabled:opacity-50 min-h-[160px]"
                    />
                    <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                        Edit the translation above. Your suggestion will be reviewed by the team.
                    </p>
                </div>
            </div>

            {/* Footer with actions */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800/60 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={handleClose}
                    disabled={isPending}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                        isPending ||
                        !suggestedCorrection.trim() ||
                        suggestedCorrection.trim() === translatedText.trim()
                    }
                    className="px-4 py-2 text-xs font-medium rounded-lg text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: '#D94A4A' }}
                >
                    {isPending ? 'Submitting...' : 'Submit Suggestion'}
                </button>
            </div>
        </div>
    );
}
