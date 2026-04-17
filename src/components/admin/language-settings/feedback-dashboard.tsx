'use client';

/**
 * E4 Feedback Dashboard
 *
 * Admin view for translation feedback submitted by users.
 * Allows reviewing, resolving, and converting feedback into
 * glossary entries or blacklist terms.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    updateFeedbackStatus,
    feedbackToGlossary,
    feedbackToBlacklist,
} from '@/lib/language-settings/actions';
import type { FeedbackEntry } from '@/lib/language-settings/actions';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FeedbackStats {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    rejected: number;
    byType: { type: string; count: number }[];
    byLangPair: { pair: string; count: number }[];
}

interface FeedbackDashboardProps {
    initialFeedback: FeedbackEntry[];
    stats: FeedbackStats;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['pending', 'reviewing', 'resolved', 'rejected'] as const;

const STATUS_BADGE: Record<string, string> = {
    pending:
        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    reviewing:
        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    resolved:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    rejected:
        'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const FEEDBACK_TYPE_OPTIONS = [
    'incorrect_term',
    'wrong_context',
    'grammar',
    'missing_nuance',
    'other',
] as const;

function feedbackTypeLabel(type: string): string {
    return type
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

// ─── Summary Card ────────────────────────────────────────────────────────────

function SummaryCard({
    label,
    value,
}: {
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mt-1">
                {value}
            </p>
        </div>
    );
}

// ─── Blacklist Inline Form ───────────────────────────────────────────────────

function BlacklistForm({
    feedbackId,
    onDone,
}: {
    feedbackId: string;
    onDone: () => void;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('');

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!term.trim() || !category.trim()) return;

        startTransition(async () => {
            try {
                await feedbackToBlacklist(feedbackId, term.trim(), category.trim());
                toast.success('Term added to blacklist');
                router.refresh();
                onDone();
            } catch {
                toast.error('Failed to add to blacklist');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex items-end gap-2 flex-wrap">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                    Term
                </label>
                <input
                    type="text"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g. problematic term"
                    className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 outline-none focus:border-gray-400 dark:focus:border-neutral-400 w-44"
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                    Category
                </label>
                <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. profanity"
                    className="px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 outline-none focus:border-gray-400 dark:focus:border-neutral-400 w-36"
                />
            </div>
            <button
                type="submit"
                disabled={isPending || !term.trim() || !category.trim()}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#D94A4A' }}
            >
                {isPending ? 'Adding...' : 'Add'}
            </button>
            <button
                type="button"
                onClick={onDone}
                className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
            >
                Cancel
            </button>
        </form>
    );
}

// ─── Feedback Card ───────────────────────────────────────────────────────────

function FeedbackCard({ entry }: { entry: FeedbackEntry }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);
    const [status, setStatus] = useState(entry.status);
    const [adminNote, setAdminNote] = useState(entry.adminNote || '');
    const [showBlacklistForm, setShowBlacklistForm] = useState(false);

    const previewText =
        entry.originalText.length > 100
            ? entry.originalText.slice(0, 100) + '...'
            : entry.originalText;

    function handleStatusChange(newStatus: string) {
        setStatus(newStatus);
        startTransition(async () => {
            try {
                await updateFeedbackStatus(entry.id, newStatus, adminNote || undefined);
                toast.success(`Status updated to ${newStatus}`);
                router.refresh();
            } catch {
                toast.error('Failed to update status');
                setStatus(entry.status);
            }
        });
    }

    function handleSaveNote() {
        startTransition(async () => {
            try {
                await updateFeedbackStatus(entry.id, status, adminNote || undefined);
                toast.success('Admin note saved');
                router.refresh();
            } catch {
                toast.error('Failed to save note');
            }
        });
    }

    function handleAddToGlossary() {
        startTransition(async () => {
            try {
                await feedbackToGlossary(entry.id);
                toast.success('Added to glossary');
                router.refresh();
            } catch {
                toast.error('Failed to add to glossary. A suggested correction is required.');
            }
        });
    }

    const langPair = `${entry.sourceLocale} → ${entry.targetLocale}`;

    return (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5">
            {/* Header */}
            <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                            {entry.user.name || entry.user.email}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                STATUS_BADGE[entry.status] || STATUS_BADGE.pending
                            }`}
                        >
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-neutral-700 dark:text-neutral-300">
                            {langPair}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            {feedbackTypeLabel(entry.feedbackType)}
                        </span>
                    </div>

                    {/* Collapsed preview */}
                    {!expanded && (
                        <p className="text-sm text-gray-600 dark:text-neutral-400 line-clamp-1">
                            {previewText}
                        </p>
                    )}
                </div>

                <span
                    className={`text-xs text-gray-400 transition-transform inline-block mt-1 shrink-0 ${
                        expanded ? 'rotate-180' : ''
                    }`}
                >
                    &#9660;
                </span>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="mt-4 space-y-4">
                    {/* Side-by-side texts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Original Text
                            </label>
                            <div className="text-sm text-gray-800 dark:text-neutral-200 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words">
                                {entry.originalText}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Translated Text
                            </label>
                            <div className="text-sm text-gray-800 dark:text-neutral-200 bg-gray-50 dark:bg-neutral-700/40 rounded-lg p-3 whitespace-pre-wrap break-words">
                                {entry.translatedText}
                            </div>
                        </div>
                    </div>

                    {entry.suggestedCorrection && (
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Suggested Correction
                            </label>
                            <div className="text-sm text-gray-800 dark:text-neutral-200 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-3 whitespace-pre-wrap break-words">
                                {entry.suggestedCorrection}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-end gap-3 flex-wrap border-t border-gray-100 dark:border-neutral-700 pt-4">
                        {/* Status dropdown */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                                disabled={isPending}
                                className="text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 outline-none disabled:opacity-50"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Add to Glossary */}
                        <button
                            onClick={handleAddToGlossary}
                            disabled={isPending || !entry.suggestedCorrection}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#D94A4A' }}
                            title={
                                !entry.suggestedCorrection
                                    ? 'No suggested correction available'
                                    : 'Create glossary entry from this feedback'
                            }
                        >
                            {isPending ? 'Processing...' : 'Add to Glossary'}
                        </button>

                        {/* Add to Blacklist */}
                        <button
                            onClick={() => setShowBlacklistForm(!showBlacklistForm)}
                            disabled={isPending}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                        >
                            Add to Blacklist
                        </button>
                    </div>

                    {/* Blacklist inline form */}
                    {showBlacklistForm && (
                        <BlacklistForm
                            feedbackId={entry.id}
                            onDone={() => setShowBlacklistForm(false)}
                        />
                    )}

                    {/* Admin note */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                            Admin Note
                        </label>
                        <div className="flex gap-2">
                            <textarea
                                value={adminNote}
                                onChange={(e) => setAdminNote(e.target.value)}
                                rows={2}
                                placeholder="Add an internal note..."
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 outline-none focus:border-gray-400 dark:focus:border-neutral-400 resize-none"
                            />
                            <button
                                onClick={handleSaveNote}
                                disabled={isPending}
                                className="self-end px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                            >
                                Save Note
                            </button>
                        </div>
                    </div>

                    {/* Resolved info */}
                    {entry.resolvedBy && entry.resolvedAt && (
                        <p className="text-xs text-gray-400 dark:text-neutral-500">
                            Resolved by {entry.resolvedBy.name || entry.resolvedBy.email} on{' '}
                            {new Date(entry.resolvedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FeedbackDashboard({ initialFeedback, stats }: FeedbackDashboardProps) {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const filtered = initialFeedback.filter((entry) => {
        if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
        if (typeFilter !== 'all' && entry.feedbackType !== typeFilter) return false;
        return true;
    });

    return (
        <div className="space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard label="Total" value={stats.total} />
                <SummaryCard label="Pending" value={stats.pending} />
                <SummaryCard label="Reviewing" value={stats.reviewing} />
                <SummaryCard label="Resolved" value={stats.resolved} />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Status filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                        Status
                    </label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 outline-none"
                    >
                        <option value="all">All Statuses</option>
                        {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Type filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                        Feedback Type
                    </label>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 outline-none"
                    >
                        <option value="all">All Types</option>
                        {FEEDBACK_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                                {feedbackTypeLabel(t)}
                            </option>
                        ))}
                    </select>
                </div>

                <span className="ml-auto text-xs text-gray-400 dark:text-neutral-500 self-end pb-1">
                    {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
                </span>
            </div>

            {/* Feedback List */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                    <p className="text-gray-500 dark:text-neutral-400 font-medium">
                        No feedback found
                    </p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">
                        {statusFilter !== 'all' || typeFilter !== 'all'
                            ? 'Try adjusting the filters.'
                            : 'No translation feedback has been submitted yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((entry) => (
                        <FeedbackCard key={entry.id} entry={entry} />
                    ))}
                </div>
            )}

            {/* Statistics Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* By Type */}
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                        By Type
                    </p>
                    {stats.byType.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-neutral-500">
                            No data yet
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {stats.byType.map((item) => (
                                <li
                                    key={item.type}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-gray-700 dark:text-neutral-300">
                                        {feedbackTypeLabel(item.type)}
                                    </span>
                                    <span className="text-gray-900 dark:text-neutral-100 font-medium font-mono">
                                        {item.count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* By Language Pair */}
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                        By Language Pair
                    </p>
                    {stats.byLangPair.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-neutral-500">
                            No data yet
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {stats.byLangPair.map((item) => (
                                <li
                                    key={item.pair}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-gray-700 dark:text-neutral-300">
                                        {item.pair}
                                    </span>
                                    <span className="text-gray-900 dark:text-neutral-100 font-medium font-mono">
                                        {item.count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
