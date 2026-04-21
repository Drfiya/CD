'use client';

/**
 * URL-insert and video-URL-insert modals for the comment input toolbar.
 *
 * Kept separate from `comment-form-controller.tsx` so the controller file
 * stays under the project's 300-line SRP ratchet and the modal markup
 * can be iterated on without scrolling past input state plumbing.
 */

interface UrlInsertModalProps {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onInsert: () => void;
}

export function UrlInsertModal({ value, onChange, onClose, onInsert }: UrlInsertModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
          Add Link
        </h3>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onInsert()}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={onInsert}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Insert Link
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoInsertModalProps {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onInsert: () => void;
}

export function VideoInsertModal({ value, onChange, onClose, onInsert }: VideoInsertModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">
          Add Video Link
        </h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
          Paste a YouTube, Vimeo, or Loom video link
        </p>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onInsert()}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100"
          >
            Cancel
          </button>
          <button
            onClick={onInsert}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Insert Video
          </button>
        </div>
      </div>
    </div>
  );
}
