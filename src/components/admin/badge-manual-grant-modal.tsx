'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Definition, Member } from './badge-designer-types';

export function BadgeManualGrantModal({
  definition,
  members,
  onClose,
  onGrant,
  isPending,
}: {
  definition: Definition;
  members: Member[];
  onClose: () => void;
  onGrant: (userId: string) => void;
  isPending: boolean;
}) {
  const [filter, setFilter] = useState('');
  const normalized = filter.trim().toLowerCase();
  const filtered = normalized
    ? members.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(normalized) ||
          m.email.toLowerCase().includes(normalized)
      )
    : members;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 id="grant-title" className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">
          Grant “{definition.label}” to a member
        </h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
          Pick a member to award this custom badge. Members already holding it will be skipped silently.
        </p>
        <input
          type="text"
          placeholder="Filter by name or email"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full mb-3 px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <ul className="max-h-72 overflow-y-auto space-y-1 pr-1">
          {filtered.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onGrant(m.id)}
                disabled={isPending}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 disabled:opacity-50 text-left"
              >
                <span className="text-sm text-gray-900 dark:text-neutral-100">
                  {m.name || m.email}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                  {m.email}
                </span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-3 py-4 text-sm text-gray-500 dark:text-neutral-400">
              No members match.
            </li>
          )}
        </ul>
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-neutral-700 mt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
