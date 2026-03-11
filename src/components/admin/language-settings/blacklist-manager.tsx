'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    createBlacklistEntry,
    toggleBlacklistEntry,
    deleteBlacklistEntry,
    bulkImportBlacklist,
} from '@/lib/language-settings/actions';
import type { BlacklistEntry } from '@/lib/language-settings/actions';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
    'Gene Symbols',
    'ICD Codes',
    'IUPAC Names',
    'INN Drug Names',
    'Brand Names',
    'Lab Values',
    'Study IDs',
    'Abbreviations',
    'Organisms',
];

interface BlacklistManagerProps {
    initialEntries: BlacklistEntry[];
    categories: string[];
}

export function BlacklistManager({ initialEntries, categories }: BlacklistManagerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Search & filter state ---
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // --- Add form state ---
    const [showAddForm, setShowAddForm] = useState(false);
    const [term, setTerm] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');

    // --- Delete confirm state ---
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // --- Bulk import state ---
    const [showBulkImport, setShowBulkImport] = useState(false);
    const [bulkResults, setBulkResults] = useState<{
        created: number;
        skipped: number;
        conflicts: string[];
    } | null>(null);

    // Merge default + existing categories and deduplicate
    const allCategories = Array.from(
        new Set([...DEFAULT_CATEGORIES, ...categories])
    ).sort();

    // --- Filtered entries ---
    const filteredEntries = initialEntries.filter((entry) => {
        const matchesSearch =
            !search ||
            entry.term.toLowerCase().includes(search.toLowerCase()) ||
            (entry.note && entry.note.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = !categoryFilter || entry.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    // --- Handlers ---

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!term.trim() || !category.trim()) {
            toast.error('Term and category are required.');
            return;
        }

        startTransition(async () => {
            try {
                const result = await createBlacklistEntry({
                    term: term.trim(),
                    category: category.trim(),
                    note: note.trim() || undefined,
                });

                if (result.glossaryConflict) {
                    toast.warning(result.glossaryConflict);
                } else {
                    toast.success(`"${term.trim()}" added to blacklist.`);
                }

                setTerm('');
                setCategory('');
                setNote('');
                setShowAddForm(false);
                router.refresh();
            } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to create entry.');
            }
        });
    };

    const handleToggle = (id: string, currentActive: boolean) => {
        startTransition(async () => {
            try {
                await toggleBlacklistEntry(id, !currentActive);
                toast.success(`Entry ${!currentActive ? 'activated' : 'deactivated'}.`);
                router.refresh();
            } catch {
                toast.error('Failed to toggle entry.');
            }
        });
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            try {
                await deleteBlacklistEntry(id);
                toast.success('Entry deleted.');
                setDeleteConfirm(null);
                router.refresh();
            } catch {
                toast.error('Failed to delete entry.');
            }
        });
    };

    const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) {
                toast.error('Could not read file.');
                return;
            }

            const lines = text.split('\n').filter((line) => line.trim());
            // Skip header if it looks like one
            const startIndex =
                lines[0]?.toLowerCase().includes('term') &&
                lines[0]?.toLowerCase().includes('category')
                    ? 1
                    : 0;

            const entries: { term: string; category: string; note?: string }[] = [];
            for (let i = startIndex; i < lines.length; i++) {
                const parts = lines[i].split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
                if (parts[0] && parts[1]) {
                    entries.push({
                        term: parts[0],
                        category: parts[1],
                        note: parts[2] || undefined,
                    });
                }
            }

            if (entries.length === 0) {
                toast.error('No valid entries found in CSV. Expected columns: term, category, note');
                return;
            }

            startTransition(async () => {
                try {
                    const result = await bulkImportBlacklist(entries);
                    setBulkResults(result);

                    if (result.conflicts.length > 0) {
                        result.conflicts.forEach((c) => toast.warning(c));
                    }

                    toast.success(
                        `Import complete: ${result.created} created, ${result.skipped} skipped.`
                    );
                    router.refresh();
                } catch {
                    toast.error('Bulk import failed.');
                }
            });
        };
        reader.readAsText(file);

        // Reset file input so the same file can be re-selected
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="space-y-5">
            {/* ── Header bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                    {filteredEntries.length} entr{filteredEntries.length !== 1 ? 'ies' : 'y'}
                    {search || categoryFilter ? ' matched' : ' total'}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowBulkImport((prev) => !prev)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                    >
                        CSV Import
                    </button>
                    <button
                        onClick={() => {
                            setShowAddForm((prev) => !prev);
                            setShowBulkImport(false);
                        }}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        + Add Entry
                    </button>
                </div>
            </div>

            {/* ── Bulk Import Section ────────────────────────────────────────── */}
            {showBulkImport && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-3">
                        Bulk Import from CSV
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3">
                        Upload a CSV file with columns: <code className="bg-gray-100 dark:bg-neutral-700 px-1 py-0.5 rounded text-xs">term,category,note</code>.
                        The first row is treated as a header if it contains &quot;term&quot; and &quot;category&quot;.
                    </p>
                    <div className="flex items-center gap-3">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,text/csv"
                            onChange={handleBulkImport}
                            disabled={isPending}
                            className="text-sm text-gray-500 dark:text-neutral-400 file:mr-3 file:px-3 file:py-1.5 file:text-xs file:font-medium file:rounded-lg file:border file:border-gray-200 dark:file:border-neutral-600 file:bg-white dark:file:bg-neutral-700 file:text-gray-700 dark:file:text-neutral-200 hover:file:bg-gray-50 dark:hover:file:bg-neutral-600 file:transition-colors file:cursor-pointer disabled:opacity-50"
                        />
                    </div>

                    {bulkResults && (
                        <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-neutral-900 text-xs space-y-1">
                            <p className="text-gray-700 dark:text-neutral-300">
                                <span className="font-medium text-green-600 dark:text-green-400">{bulkResults.created}</span> created,{' '}
                                <span className="font-medium text-gray-500 dark:text-neutral-400">{bulkResults.skipped}</span> skipped
                            </p>
                            {bulkResults.conflicts.length > 0 && (
                                <div className="text-amber-600 dark:text-amber-400 space-y-0.5">
                                    <p className="font-medium">Glossary conflicts:</p>
                                    {bulkResults.conflicts.map((c, i) => (
                                        <p key={i}>{c}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Add Form ───────────────────────────────────────────────────── */}
            {showAddForm && (
                <form
                    onSubmit={handleCreate}
                    className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5"
                >
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                        Add Blacklist Entry
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Term */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Term *
                            </label>
                            <input
                                type="text"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                placeholder="e.g. BRCA1"
                                required
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Category *
                            </label>
                            <input
                                type="text"
                                list="blacklist-categories"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="Select or type a category"
                                required
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                            />
                            <datalist id="blacklist-categories">
                                {allCategories.map((cat) => (
                                    <option key={cat} value={cat} />
                                ))}
                            </datalist>
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Note
                            </label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Optional context"
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 mt-4">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(false);
                                setTerm('');
                                setCategory('');
                                setNote('');
                            }}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !term.trim() || !category.trim()}
                            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                            style={{ backgroundColor: '#D94A4A' }}
                        >
                            {isPending ? 'Adding...' : 'Add Entry'}
                        </button>
                    </div>
                </form>
            )}

            {/* ── Search & Filter ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search terms or notes..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                    />
                </div>
                <div className="sm:w-56">
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                    >
                        <option value="">All Categories</option>
                        {allCategories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table ──────────────────────────────────────────────────────── */}
            {filteredEntries.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600 mb-3"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
                        />
                    </svg>
                    <p className="text-gray-500 dark:text-neutral-400 font-medium">
                        {search || categoryFilter
                            ? 'No entries match your filters'
                            : 'No blacklist entries yet'}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">
                        {search || categoryFilter
                            ? 'Try adjusting your search or category filter.'
                            : 'Click "Add Entry" to create your first blacklist term.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-neutral-700 text-left">
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                                        Term
                                    </th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                                        Category
                                    </th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 hidden lg:table-cell">
                                        Note
                                    </th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-24 text-center">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 hidden md:table-cell">
                                        Created
                                    </th>
                                    <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-32 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEntries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-gray-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors"
                                    >
                                        {/* Term */}
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900 dark:text-neutral-100">
                                                {entry.term}
                                            </span>
                                        </td>

                                        {/* Category */}
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                {entry.category}
                                            </span>
                                        </td>

                                        {/* Note */}
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="text-gray-500 dark:text-neutral-400 text-xs line-clamp-1">
                                                {entry.note || '\u2014'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => handleToggle(entry.id, entry.isActive)}
                                                disabled={isPending}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                                    entry.isActive
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-400'
                                                }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        entry.isActive ? 'bg-green-500' : 'bg-gray-400'
                                                    }`}
                                                />
                                                {entry.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>

                                        {/* Created */}
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="text-xs text-gray-400 dark:text-neutral-500">
                                                {formatDate(entry.createdAt)}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-3 text-right">
                                            {deleteConfirm === entry.id ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleDelete(entry.id)}
                                                        disabled={isPending}
                                                        className="text-red-600 dark:text-red-400 text-sm font-medium"
                                                    >
                                                        Confirm
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm(null)}
                                                        className="text-gray-400 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setDeleteConfirm(entry.id)}
                                                    className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
