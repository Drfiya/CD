'use client';

import { useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/avatar';
import { CommentContent } from './comment-content-parser';
import { CommentInput } from './comment-form-controller';

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

interface CommentThreadTreeProps {
  postId: string;
  currentUserId?: string;
  userImage?: string | null;
  comments: Comment[];
}

import { useRouter } from 'next/navigation';
import { deleteComment } from '@/lib/comment-actions';
import { useTranslations } from '@/components/translation/TranslationContext';

/**
 * Renders the list of top-level comments, the inline reply input, and the
 * "Show N replies" toggle. Owns the transient UI state for replies — no
 * server mutation logic lives here; that sits in CommentInput.
 */
export function CommentThreadTree({ postId, currentUserId, userImage, comments }: CommentThreadTreeProps) {
  const ui = useTranslations('comment');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const executeDelete = (commentId: string) => {
    startTransition(async () => {
      await deleteComment(commentId);
      setConfirmDeleteId(null);
      router.refresh();
    });
  };

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }

  if (comments.length === 0) return null;

  return (
    <div className="space-y-4 mt-4">
      {comments.map((comment) => {
        const replyCount = comment.replies?.length ?? 0;
        const showReplies = expandedReplies.has(comment.id);
        const isReplying = replyingTo === comment.id;

        return (
          <div key={comment.id} className="flex gap-3">
            <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-gray-900 dark:text-neutral-100">
                  {comment.authorName || 'Anonymous'}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">
                  · {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })} ago
                </span>
              </div>
              <CommentContent content={comment.content} />

              {currentUserId && (
                <div className="mt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setReplyingTo(isReplying ? null : comment.id)}
                    className="text-xs text-gray-400 dark:text-neutral-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                  >
                    {isReplying ? ui.cancel : ui.reply}
                  </button>
                  {currentUserId === comment.authorId && (
                    confirmDeleteId === comment.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-red-500">{ui.confirmDelete}</span>
                        <button type="button" onClick={() => executeDelete(comment.id)} disabled={isPending} className="text-xs font-bold text-red-600 hover:text-red-700">{ui.confirmYes}</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={isPending} className="text-xs text-gray-500 hover:text-gray-700">{ui.confirmNo}</button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(comment.id)}
                        disabled={isPending}
                        className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        {ui.delete}
                      </button>
                    )
                  )}
                </div>
              )}

              {isReplying && (
                <div className="mt-2">
                  <CommentInput
                    postId={postId}
                    userImage={userImage}
                    parentId={comment.id}
                    onSubmitted={() => {
                      setReplyingTo(null);
                      setExpandedReplies((prev) => {
                        const next = new Set(prev);
                        next.add(comment.id);
                        return next;
                      });
                    }}
                    compact
                  />
                </div>
              )}

              {replyCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleReplies(comment.id)}
                  className="mt-2 text-xs font-medium text-blue-500 dark:text-blue-400 hover:underline"
                >
                  {showReplies
                    ? 'Hide replies'
                    : `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
                </button>
              )}

              {showReplies && comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100 dark:border-neutral-700">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-2">
                      <Avatar src={reply.authorImage} name={reply.authorName} size="sm" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-gray-900 dark:text-neutral-100">
                            {reply.authorName || 'Anonymous'}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-neutral-500">
                            · {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: false })} ago
                          </span>
                        </div>
                        <CommentContent content={reply.content} />
                        {currentUserId === reply.authorId && (
                          <div className="mt-1 flex items-center gap-3">
                            {confirmDeleteId === reply.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-red-500">{ui.confirmDelete}</span>
                                <button type="button" onClick={() => executeDelete(reply.id)} disabled={isPending} className="text-xs font-bold text-red-600 hover:text-red-700">{ui.confirmYes}</button>
                                <button type="button" onClick={() => setConfirmDeleteId(null)} disabled={isPending} className="text-xs text-gray-500 hover:text-gray-700">{ui.confirmNo}</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(reply.id)}
                                disabled={isPending}
                                className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500 transition-colors disabled:opacity-50"
                              >
                                {ui.delete}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
