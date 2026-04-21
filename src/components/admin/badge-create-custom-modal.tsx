'use client';

import { Button } from '@/components/ui/button';
import { DESCRIPTION_MAX } from './badge-designer-types';

export function BadgeCreateCustomModal({
  onClose,
  onSubmit,
  isPending,
}: {
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  isPending: boolean;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-custom-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 id="create-custom-title" className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
          Create custom badge
        </h3>
        <form
          action={(fd) => onSubmit(fd)}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Key (slug)</label>
            <input
              name="key"
              type="text"
              required
              placeholder="early-supporter"
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Label</label>
            <input
              name="label"
              type="text"
              required
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Description</label>
            <textarea
              name="description"
              required
              rows={2}
              maxLength={DESCRIPTION_MAX}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Emoji</label>
              <input
                name="emoji"
                type="text"
                required
                maxLength={16}
                defaultValue="⭐"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Color</label>
              <input
                name="colorHex"
                type="color"
                defaultValue="#D94A4A"
                className="w-full h-10 rounded-md border border-gray-300 dark:border-neutral-700 cursor-pointer"
              />
            </div>
          </div>
          <input type="hidden" name="sortOrder" value="500" />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
