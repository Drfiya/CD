'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/feed/like-button';
import { LevelBadge } from '@/components/gamification/level-badge';
import { RoleBadge } from '@/components/admin/role-badge';
import { updateComment, deleteComment } from '@/lib/comment-actions';
import { UGCText } from '@/components/translation/UGCText';

interface CommentCardProps {
  comment: {
    id: string;
    content: string;
    authorId: string;
    authorName: string | null;
    authorImage: string | null;
    authorLevel: number;
    authorRole: string;
    createdAt: Date;
    updatedAt: Date;
  };
  postAuthorId: string;
  currentUserId?: string;
  likeCount: number;
  isLiked: boolean;
}

export function CommentCard({ comment, postAuthorId, currentUserId, likeCount, isLiked }: CommentCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAuthor = currentUserId === comment.authorId;
  const isPostAuthor = comment.authorId === postAuthorId;
  const isEdited = new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() + 1000;

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    startTransition(async () => {
      setError(null);
      const result = await updateComment(comment.id, editContent.trim());

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to update comment');
        return;
      }

      setIsEditing(false);
      router.refresh();
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
    setError(null);
  };

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const result = await deleteComment(comment.id);

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete comment');
        setIsConfirming(false);
        return;
      }

      router.refresh();
    });
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg ${
        isPostAuthor ? 'bg-muted/50' : ''
      }`}
    >
      <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />

      <div className="flex-1 min-w-0">
        {/* Header: name + level badge + timestamp + edited indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{comment.authorName || 'Anonymous'}</span>
          <RoleBadge role={comment.authorRole} size="sm" />
          <LevelBadge level={comment.authorLevel} size="sm" />
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
          </span>
          {isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        {/* Content or edit mode */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              maxLength={2000}
              disabled={isPending}
            />
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                disabled={isPending || !editContent.trim()}
              >
                {isPending ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isPending}
              >
                Cancel
              </Button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </div>
        ) : (
          <>
            <UGCText as="p" className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.content}</UGCText>

            {/* Footer: like button + author actions */}
            <div className="mt-2 flex items-center gap-3">
              {/* Like button */}
              <LikeButton
                targetId={comment.id}
                targetType="comment"
                initialLiked={isLiked}
                initialCount={likeCount}
              />

              {/* Author actions */}
              {isAuthor && !isConfirming && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirming(true)}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </>
              )}

              {/* Delete confirmation */}
              {isAuthor && isConfirming && (
                <>
                  <span className="text-xs text-muted-foreground">Are you sure?</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirming(false)}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                  >
                    {isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                  {error && <span className="text-xs text-red-600">{error}</span>}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
