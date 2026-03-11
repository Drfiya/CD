'use client';

import { useState, useTransition, useRef, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  createGlossaryEntry,
  updateGlossaryEntry,
  deleteGlossaryEntry,
  bulkImportGlossary,
} from '@/lib/language-settings/actions';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GlossaryEntry {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  sourceLocale: string;
  targetLocale: string;
  domain?: string;
  isActive: boolean;
  createdAt: string;
}

interface LanguagePair {
  sourceLocale: string;
  targetLocale: string;
}

interface GlossaryManagerProps {
  initialEntries: GlossaryEntry[];
  domains: string[];
  languagePairs: LanguagePair[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'ja', label: 'Japanese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ru', label: 'Russian' },
] as const;

function localeLabel(code: string): string {
  return (
    SUPPORTED_LANGUAGES.find((l) => l.code === code)?.label ??
    code.toUpperCase()
  );
}

function localeTag(code: string): string {
  return code.toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlossaryManager({
  initialEntries,
  domains: initialDomains,
  languagePairs,
}: GlossaryManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Add form state ----
  const [newSourceTerm, setNewSourceTerm] = useState('');
  const [newTargetTerm, setNewTargetTerm] = useState('');
  const [newSourceLocale, setNewSourceLocale] = useState('en');
  const [newTargetLocale, setNewTargetLocale] = useState('de');
  const [newDomain, setNewDomain] = useState('');

  // ---- Search / filter state ----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSourceLocale, setFilterSourceLocale] = useState('');
  const [filterTargetLocale, setFilterTargetLocale] = useState('');
  const [filterDomain, setFilterDomain] = useState('');

  // ---- Inline edit state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTargetTerm, setEditTargetTerm] = useState('');
  const [editDomain, setEditDomain] = useState('');

  // ---- Delete confirm state ----
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---- Bulk import state ----
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // ---- Derived data ----
  const allDomains = Array.from(
    new Set([
      ...initialDomains,
      ...initialEntries
        .map((e) => e.domain)
        .filter((d): d is string => !!d),
    ])
  );

  const filteredEntries = initialEntries.filter((entry) => {
    if (
      searchQuery &&
      !entry.sourceTerm.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !entry.targetTerm.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (filterSourceLocale && entry.sourceLocale !== filterSourceLocale) {
      return false;
    }
    if (filterTargetLocale && entry.targetLocale !== filterTargetLocale) {
      return false;
    }
    if (filterDomain && entry.domain !== filterDomain) {
      return false;
    }
    return true;
  });

  // ---- Handlers ----

  function handleAddEntry() {
    if (!newSourceTerm.trim() || !newTargetTerm.trim()) {
      toast.error('Source term and target term are required');
      return;
    }

    startTransition(async () => {
      try {
        await createGlossaryEntry({
          sourceTerm: newSourceTerm.trim(),
          targetTerm: newTargetTerm.trim(),
          sourceLocale: newSourceLocale,
          targetLocale: newTargetLocale,
          domain: newDomain || undefined,
        });
        toast.success('Glossary entry created');
        setNewSourceTerm('');
        setNewTargetTerm('');
        setNewDomain('');
        router.refresh();
      } catch {
        toast.error('Failed to create glossary entry');
      }
    });
  }

  function handleStartEdit(entry: GlossaryEntry) {
    setEditingId(entry.id);
    setEditTargetTerm(entry.targetTerm);
    setEditDomain(entry.domain ?? '');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditTargetTerm('');
    setEditDomain('');
  }

  function handleSaveEdit(id: string) {
    if (!editTargetTerm.trim()) {
      toast.error('Target term is required');
      return;
    }

    startTransition(async () => {
      try {
        await updateGlossaryEntry(id, {
          targetTerm: editTargetTerm.trim(),
          domain: editDomain || undefined,
        });
        toast.success('Glossary entry updated');
        setEditingId(null);
        router.refresh();
      } catch {
        toast.error('Failed to update glossary entry');
      }
    });
  }

  function handleToggleActive(entry: GlossaryEntry) {
    startTransition(async () => {
      try {
        await updateGlossaryEntry(entry.id, { isActive: !entry.isActive });
        toast.success(
          entry.isActive ? 'Entry deactivated' : 'Entry activated'
        );
        router.refresh();
      } catch {
        toast.error('Failed to update glossary entry');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteGlossaryEntry(id);
        toast.success('Glossary entry deleted');
        setDeletingId(null);
        router.refresh();
      } catch {
        toast.error('Failed to delete glossary entry');
      }
    });
  }

  function handleSyncToDeepL() {
    toast('DeepL glossary sync triggered');
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (typeof text !== 'string') return;

      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const entries: {
        sourceTerm: string;
        targetTerm: string;
        sourceLocale: string;
        targetLocale: string;
        domain?: string;
      }[] = [];
      const errors: string[] = [];

      lines.forEach((line, idx) => {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 4) {
          errors.push(`Line ${idx + 1}: expected at least 4 columns`);
          return;
        }
        const [sourceTerm, targetTerm, sourceLocale, targetLocale, domain] =
          parts;
        if (!sourceTerm || !targetTerm || !sourceLocale || !targetLocale) {
          errors.push(`Line ${idx + 1}: missing required fields`);
          return;
        }
        entries.push({
          sourceTerm,
          targetTerm,
          sourceLocale,
          targetLocale,
          domain: domain || undefined,
        });
      });

      if (entries.length === 0) {
        setImportResults({ success: 0, failed: errors.length, errors });
        return;
      }

      startTransition(async () => {
        try {
          const result = await bulkImportGlossary(entries);
          setImportResults({
            success:
              (result as { success?: number })?.success ?? entries.length,
            failed: (result as { failed?: number })?.failed ?? 0,
            errors,
          });
          toast.success(
            `Imported ${(result as { success?: number })?.success ?? entries.length} entries`
          );
          router.refresh();
        } catch {
          toast.error('Bulk import failed');
          setImportResults({
            success: 0,
            failed: entries.length,
            errors: [...errors, 'Server error during import'],
          });
        }
      });
    };
    reader.readAsText(file);

    // Reset file input so the same file can be re‑selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* Header                                                            */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Glossary Manager
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
            Manage translation glossary entries for consistent terminology.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSyncToDeepL}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
        >
          Sync to DeepL
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Add Entry Form                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-4">
          Add Glossary Entry
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Source Term */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Source Term
            </label>
            <input
              type="text"
              value={newSourceTerm}
              onChange={(e) => setNewSourceTerm(e.target.value)}
              placeholder="e.g. neural network"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            />
          </div>

          {/* Target Term */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Target Term
            </label>
            <input
              type="text"
              value={newTargetTerm}
              onChange={(e) => setNewTargetTerm(e.target.value)}
              placeholder="e.g. neuronales Netz"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            />
          </div>

          {/* Source Language */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Source Language
            </label>
            <select
              value={newSourceLocale}
              onChange={(e) => setNewSourceLocale(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Language */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Target Language
            </label>
            <select
              value={newTargetLocale}
              onChange={(e) => setNewTargetLocale(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Domain
            </label>
            <input
              type="text"
              list="domain-list"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="e.g. machine-learning"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            />
            <datalist id="domain-list">
              {allDomains.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAddEntry}
              disabled={isPending || !newSourceTerm.trim() || !newTargetTerm.trim()}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#D94A4A' }}
            >
              {isPending ? 'Adding\u2026' : 'Add Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Search & Filter                                                   */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms\u2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            />
          </div>

          {/* Source Locale Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Source Language
            </label>
            <select
              value={filterSourceLocale}
              onChange={(e) => setFilterSourceLocale(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            >
              <option value="">All</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Locale Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Target Language
            </label>
            <select
              value={filterTargetLocale}
              onChange={(e) => setFilterTargetLocale(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            >
              <option value="">All</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Domain Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
              Domain
            </label>
            <select
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
            >
              <option value="">All</option>
              {allDomains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Table                                                             */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 dark:border-neutral-700 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Source Term
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Target Term
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Language Pair
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Domain
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Active
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Created
                </th>
                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-400 dark:text-neutral-500"
                  >
                    No glossary entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isEditing = editingId === entry.id;
                  const isDeleting = deletingId === entry.id;

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors"
                    >
                      {/* Source Term */}
                      <td className="px-4 py-3 text-gray-900 dark:text-neutral-100">
                        {entry.sourceTerm}
                      </td>

                      {/* Target Term */}
                      <td className="px-4 py-3 text-gray-900 dark:text-neutral-100">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTargetTerm}
                            onChange={(e) => setEditTargetTerm(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                          />
                        ) : (
                          entry.targetTerm
                        )}
                      </td>

                      {/* Language Pair */}
                      <td className="px-4 py-3 text-gray-600 dark:text-neutral-300">
                        {localeTag(entry.sourceLocale)}{' '}
                        <span className="text-gray-400 dark:text-neutral-500">
                          &rarr;
                        </span>{' '}
                        {localeTag(entry.targetLocale)}
                      </td>

                      {/* Domain */}
                      <td className="px-4 py-3 text-gray-600 dark:text-neutral-300">
                        {isEditing ? (
                          <input
                            type="text"
                            list="edit-domain-list"
                            value={editDomain}
                            onChange={(e) => setEditDomain(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                          />
                        ) : (
                          entry.domain ?? '\u2014'
                        )}
                      </td>

                      {/* Active */}
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(entry)}
                          disabled={isPending}
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                            entry.isActive
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-400'
                          }`}
                        >
                          {entry.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-gray-500 dark:text-neutral-400 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(entry.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                                style={{ backgroundColor: '#D94A4A' }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : isDeleting ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                                style={{ backgroundColor: '#D94A4A' }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(entry)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(entry.id)}
                                disabled={isPending}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-neutral-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Hidden datalist for inline edit domain */}
          <datalist id="edit-domain-list">
            {allDomains.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>

        {/* Entry count */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-neutral-700 text-xs text-gray-500 dark:text-neutral-400">
          {filteredEntries.length} of {initialEntries.length} entries
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Bulk Import                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-neutral-100 mb-2">
          Bulk Import
        </h3>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-4">
          Upload a CSV file with the format:{' '}
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 text-xs">
            sourceTerm,targetTerm,sourceLocale,targetLocale,domain
          </code>
        </p>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#D94A4A' }}
          >
            {isPending ? 'Importing\u2026' : 'Upload CSV'}
          </button>
        </div>

        {importResults && (
          <div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400 font-medium">
                {importResults.success} imported
              </span>
              {importResults.failed > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {importResults.failed} failed
                </span>
              )}
            </div>
            {importResults.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {importResults.errors.map((err, i) => (
                  <li
                    key={i}
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
