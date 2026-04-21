'use client';

import Link from 'next/link';
import { CommentInput } from './comment-form-controller';
import { CommentThreadTree } from './comment-thread-tree';

interface CommentReply {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  createdAt: Date;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  createdAt: Date;
  replies?: CommentReply[];
}

interface CommentSectionProps {
  postId: string;
  currentUserId?: string;
  userImage?: string | null;
  comments: Comment[];
}

/**
 * Thin composition root: comment input + comment thread tree.
 *
 * The heavy lifting — rich-content parsing, celebration toast orchestration,
 * input modals (emoji / URL / video / GIF) — now lives in sibling modules:
 *   - comment-content-parser.tsx
 *   - comment-toast-orchestrator.tsx
 *   - comment-toast-offsets.ts
 *   - comment-form-controller.tsx (CommentInput)
 *   - comment-thread-tree.tsx (CommentThreadTree)
 *
 * CR8 brief listed `comment-optimistic-state` as a 4th extraction target, but
 * the comment surface does not use `useOptimistic` — it relies on server
 * actions + `router.refresh()`. The extraction was speculative and is
 * deliberately NOT performed. If future work introduces optimistic UI for
 * comments (e.g. fade-in on send), extract that state into
 * `comment-optimistic-state.tsx` at that time. See `revision_log.md` entry F2.
 */
export function CommentSection({ postId, currentUserId, userImage, comments }: CommentSectionProps) {
  return (
    <div className="space-y-4">
      {currentUserId ? (
        <CommentInput postId={postId} userImage={userImage} />
      ) : (
        <div className="p-4 text-center bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
          <p className="text-sm text-gray-500 dark:text-neutral-400">
            <Link href="/login" className="text-blue-600 hover:underline">
              Sign in
            </Link>{' '}
            to leave a comment
          </p>
        </div>
      )}

      <CommentThreadTree
        postId={postId}
        currentUserId={currentUserId}
        userImage={userImage}
        comments={comments}
      />
    </div>
  );
}
