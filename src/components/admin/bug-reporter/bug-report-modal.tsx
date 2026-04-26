'use client';

/**
 * CR14 — BugReportModal
 *
 * Form fields:
 *   - Title (required, VarChar 200)
 *   - Description (required, textarea)
 *   - Priority: P1 / P2 / P3 / P4
 *   - Reproducibility: Always / Sometimes / Once
 *   - Category: UI / Performance / Backend / Auth / Data / Other
 *   - Page URL (auto-filled from window.location.href)
 *   - Screenshots (via ScreenshotUploader — max 5, 5 MB each, images only)
 *
 * Closes on success; calls onClose on cancel or backdrop click.
 */

import { useState, useEffect, useRef } from 'react';
import { createBugReport } from '@/lib/bug-reporter-actions';
import {
  BUG_PRIORITIES,
  BUG_REPRODUCIBILITIES,
  BUG_CATEGORIES,
  type ScreenshotRef,
} from '@/lib/validations/bug-reporter';
import { ScreenshotUploader } from './screenshot-uploader';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 — Critical',
  P2: 'P2 — High',
  P3: 'P3 — Medium',
  P4: 'P4 — Low',
};

const REPRODUCIBILITY_LABELS: Record<string, string> = {
  ALWAYS: 'Always',
  SOMETIMES: 'Sometimes',
  ONCE: 'Once',
};

export function BugReportModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('P2');
  const [reproducibility, setReproducibility] = useState<string>('ALWAYS');
  const [category, setCategory] = useState<string>('UI');
  const [pageUrl, setPageUrl] = useState('');
  const [screenshots, setScreenshots] = useState<ScreenshotRef[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Auto-fill page URL
  useEffect(() => {
    setPageUrl(typeof window !== 'undefined' ? window.location.href : '');
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const result = await createBugReport({
        title: title.trim(),
        description: description.trim(),
        priority,
        reproducibility,
        category,
        pageUrl,
        screenshots,
      });

      if ('error' in result) {
        toast.error(result.error);
        return;
      }

      toast.success('Bug report submitted');
      onClose();
    } catch {
      toast.error('Failed to submit bug report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    /* Backdrop — intentionally does NOT close on click outside (prevents accidental data loss) */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Report a bug"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-neutral-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
            🐛 Report a Bug
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              ref={firstInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="Brief description of the bug"
              className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              required
              placeholder="Steps to reproduce, expected vs actual behaviour…"
              className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground resize-none"
            />
          </div>

          {/* Priority + Reproducibility row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                {BUG_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
                Reproducibility
              </label>
              <select
                value={reproducibility}
                onChange={(e) => setReproducibility(e.target.value)}
                className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
              >
                {BUG_REPRODUCIBILITIES.map((r) => (
                  <option key={r} value={r}>
                    {REPRODUCIBILITY_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
            >
              {BUG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Page URL */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Page URL
            </label>
            <input
              type="url"
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              maxLength={2048}
              placeholder="https://…"
              className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 placeholder:text-muted-foreground"
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Screenshots <span className="text-muted-foreground font-normal">(optional, max 5)</span>
            </label>
            <ScreenshotUploader
              current={screenshots}
              onUploaded={(ref) => setScreenshots((prev) => [...prev, ref])}
              onRemove={(i) => setScreenshots((prev) => prev.filter((_, idx) => idx !== i))}
              disabled={submitting}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 dark:border-neutral-700 px-4 py-1.5 text-sm text-muted-foreground hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !description.trim()}
              className="rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-white transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Bug Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
