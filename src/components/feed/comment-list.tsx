import Link from 'next/link';
import db from '@/lib/db';
import { CommentCard } from '@/components/feed/comment-card';
import { CommentForm } from '@/components/feed/comment-form';
import { EmptyState } from '@/components/ui/empty-state';

interface CommentListProps {
  postId: string;
  postAuthorId: string;
  currentUserId?: string;
}

export async function CommentList({ postId, postAuthorId, currentUserId }: CommentListProps) {
  const comments = await db.comment.findMany({
    where: { postId },
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          level: true,
          role: true,
          badges: {
            select: { type: true, customDefinitionId: true },
            orderBy: { earnedAt: 'asc' },
            take: 3,
          },
          _count: { select: { badges: true } },
        },
      },
      _count: {
        select: { likes: true },
      },
      ...(currentUserId
        ? {
            likes: {
              where: { userId: currentUserId },
              take: 1,
            },
          }
        : {}),
    },
  });

  // Transform comments to add isLiked and likeCount
  const commentsWithLikeStatus = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorImage: comment.author.image,
    authorLevel: comment.author.level,
    authorRole: comment.author.role,
    authorBadges: comment.author.badges,
    authorBadgeCount: comment.author._count.badges,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    likeCount: comment._count.likes,
    isLiked: 'likes' in comment && Array.isArray(comment.likes) && comment.likes.length > 0,
  }));

  return (
    <div>
      {/* Comments list */}
      {commentsWithLikeStatus.length === 0 ? (
        <EmptyState
          icon={
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          }
          title="Be the first to comment"
          description="Share your thoughts on this post"
        />
      ) : (
        <div className="space-y-1">
          {commentsWithLikeStatus.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              likeCount={comment.likeCount}
              isLiked={comment.isLiked}
            />
          ))}
        </div>
      )}

      {/* Comment form or sign in message */}
      {currentUserId ? (
        <CommentForm postId={postId} />
      ) : (
        <div className="mt-4 p-4 text-center border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{' '}
            to leave a comment
          </p>
        </div>
      )}
    </div>
  );
}
