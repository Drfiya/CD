'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { editCommentAsAdmin } from '@/lib/admin-actions';
import { toast } from 'sonner';

interface EditCommentDialogProps {
  commentId: string;
  initialContent: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Dialog for editing a comment as moderator/admin.
 * Comments are plain text (max 2000 characters).
 */
export function EditCommentDialog({
  commentId,
  initialContent,
  onClose,
  onSuccess,
}: EditCommentDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Comment content cannot be empty');
      return;
    }

    if (content.length > 2000) {
      toast.error('Comment exceeds maximum length of 2000 characters');
      return;
    }

    startTransition(async () => {
      const result = await editCommentAsAdmin(commentId, content);

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to edit comment');
        return;
      }

      toast.success('Comment updated successfully');
      onSuccess();
    });
  };

  const remainingChars = 2000 - content.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Comment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close dialog"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-6 h-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4">
            <label htmlFor="comment-content" className="block text-sm font-medium text-gray-700 mb-2">
              Comment Content
            </label>
            <textarea
              id="comment-content"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter comment content..."
              disabled={isPending}
              maxLength={2000}
            />
            <div className="flex justify-between mt-1 text-sm">
              <p className="text-muted-foreground">
                This edit will not show any indicator to users (silent edit).
              </p>
              <span className={remainingChars < 100 ? 'text-orange-500' : 'text-muted-foreground'}>
                {remainingChars} characters remaining
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
