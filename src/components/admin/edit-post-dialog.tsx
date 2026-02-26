'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { editPostAsAdmin } from '@/lib/admin-actions';
import { toast } from 'sonner';

interface EditPostDialogProps {
  postId: string;
  initialContent: unknown;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Extract plain text from Tiptap JSON content for editing.
 * Posts store rich text, but admin edits use plain text for simplicity.
 */
function extractTextFromTiptap(content: unknown): string {
  if (!content || typeof content !== 'object') return '';

  const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return '';

  return doc.content
    .map((node) => {
      if (!node.content) return '';
      return node.content.map((child) => child.text || '').join('');
    })
    .join('\n');
}

/**
 * Convert plain text to Tiptap JSON format.
 */
function textToTiptap(text: string): unknown {
  const paragraphs = text.split('\n').filter((line) => line.trim() !== '');

  if (paragraphs.length === 0) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  return {
    type: 'doc',
    content: paragraphs.map((para) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: para }],
    })),
  };
}

/**
 * Dialog for editing a post as moderator/admin.
 * Uses plain text editor for simplicity - rich text editing not needed for moderation.
 */
export function EditPostDialog({
  postId,
  initialContent,
  onClose,
  onSuccess,
}: EditPostDialogProps) {
  const [content, setContent] = useState(() => extractTextFromTiptap(initialContent));
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error('Post content cannot be empty');
      return;
    }

    startTransition(async () => {
      const tiptapContent = textToTiptap(content);
      const result = await editPostAsAdmin(postId, tiptapContent);

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to edit post');
        return;
      }

      toast.success('Post updated successfully');
      onSuccess();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Edit Post</h2>
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
            <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-2">
              Post Content
            </label>
            <textarea
              id="post-content"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-48 px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter post content..."
              disabled={isPending}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              This edit will not show any indicator to users (silent edit).
            </p>
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
