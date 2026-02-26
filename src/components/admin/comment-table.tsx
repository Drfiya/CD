'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { EditCommentDialog } from '@/components/admin/edit-comment-dialog';
import { deleteCommentAsAdmin } from '@/lib/admin-actions';
import { toast } from 'sonner';

interface Comment {
  id: string;
  content: string;
  createdAt: Date;
  postId: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    likes: number;
  };
}

interface CommentTableProps {
  comments: Comment[];
}

/**
 * Truncate text to a max length with ellipsis.
 */
function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Table displaying comments for moderation with edit/delete actions.
 */
export function CommentTable({ comments }: CommentTableProps) {
  const router = useRouter();
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      const result = await deleteCommentAsAdmin(commentId);

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to delete comment');
        setConfirmingId(null);
        return;
      }

      toast.success('Comment deleted successfully');
      setConfirmingId(null);
      router.refresh();
    });
  };

  const handleEditSuccess = () => {
    setEditingComment(null);
    router.refresh();
  };

  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <svg
          className="w-12 h-12 mx-auto mb-4 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-lg font-medium">No comments found</p>
        <p className="text-sm mt-1">Comments will appear here once members create them.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-sm">Author</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Content</th>
              <th className="text-center py-3 px-4 font-medium text-sm">Likes</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Post</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Created</th>
              <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => (
              <tr key={comment.id} className="border-b hover:bg-gray-50">
                {/* Author */}
                <td className="py-3 px-4">
                  <Link
                    href={`/members/${comment.author.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar src={comment.author.image} name={comment.author.name} size="sm" />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {comment.author.name || comment.author.email}
                    </span>
                  </Link>
                </td>

                {/* Content */}
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-700 line-clamp-2">
                    {truncate(comment.content)}
                  </span>
                </td>

                {/* Likes */}
                <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                  {comment._count.likes}
                </td>

                {/* Parent post link */}
                <td className="py-3 px-4">
                  <Link
                    href={`/feed/${comment.postId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View post
                  </Link>
                </td>

                {/* Created */}
                <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {confirmingId === comment.id ? (
                      <>
                        <span className="text-sm text-muted-foreground mr-2">Delete?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(null)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(comment.id)}
                          disabled={isPending}
                        >
                          {isPending ? 'Deleting...' : 'Confirm'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingComment(comment)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(comment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit dialog */}
      {editingComment && (
        <EditCommentDialog
          commentId={editingComment.id}
          initialContent={editingComment.content}
          onClose={() => setEditingComment(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
