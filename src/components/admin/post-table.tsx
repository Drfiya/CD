'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { EditPostDialog } from '@/components/admin/edit-post-dialog';
import { deletePostAsAdmin } from '@/lib/admin-actions';
import { toast } from 'sonner';

interface Post {
  id: string;
  content: unknown;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
}

interface PostTableProps {
  posts: Post[];
}

/**
 * Extract preview text from Tiptap JSON content.
 */
function extractPreview(content: unknown, maxLength: number = 100): string {
  if (!content || typeof content !== 'object') return '(No content)';

  const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
  if (!doc.content) return '(No content)';

  const text = doc.content
    .map((node) => {
      if (!node.content) return '';
      return node.content.map((child) => child.text || '').join('');
    })
    .join(' ')
    .trim();

  if (!text) return '(No content)';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Table displaying posts for moderation with edit/delete actions.
 */
export function PostTable({ posts }: PostTableProps) {
  const router = useRouter();
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (postId: string) => {
    startTransition(async () => {
      const result = await deletePostAsAdmin(postId);

      if ('error' in result) {
        toast.error(typeof result.error === 'string' ? result.error : 'Failed to delete post');
        setConfirmingId(null);
        return;
      }

      toast.success('Post deleted successfully');
      setConfirmingId(null);
      router.refresh();
    });
  };

  const handleEditSuccess = () => {
    setEditingPost(null);
    router.refresh();
  };

  if (posts.length === 0) {
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
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
        <p className="text-lg font-medium">No posts found</p>
        <p className="text-sm mt-1">Posts will appear here once members create them.</p>
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
              <th className="text-left py-3 px-4 font-medium text-sm">Preview</th>
              <th className="text-center py-3 px-4 font-medium text-sm">Likes</th>
              <th className="text-center py-3 px-4 font-medium text-sm">Comments</th>
              <th className="text-left py-3 px-4 font-medium text-sm">Created</th>
              <th className="text-right py-3 px-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b hover:bg-gray-50">
                {/* Author */}
                <td className="py-3 px-4">
                  <Link
                    href={`/members/${post.author.id}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    <Avatar src={post.author.image} name={post.author.name} size="sm" />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {post.author.name || post.author.email}
                    </span>
                  </Link>
                </td>

                {/* Preview */}
                <td className="py-3 px-4">
                  <Link
                    href={`/feed/${post.id}`}
                    className="text-sm text-gray-700 hover:text-primary hover:underline line-clamp-2"
                  >
                    {extractPreview(post.content)}
                  </Link>
                </td>

                {/* Likes */}
                <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                  {post._count.likes}
                </td>

                {/* Comments */}
                <td className="py-3 px-4 text-center text-sm text-muted-foreground">
                  {post._count.comments}
                </td>

                {/* Created */}
                <td className="py-3 px-4 text-sm text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-2">
                    {confirmingId === post.id ? (
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
                          onClick={() => handleDelete(post.id)}
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
                          onClick={() => setEditingPost(post)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(post.id)}
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
      {editingPost && (
        <EditPostDialog
          postId={editingPost.id}
          initialContent={editingPost.content}
          onClose={() => setEditingPost(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  );
}
