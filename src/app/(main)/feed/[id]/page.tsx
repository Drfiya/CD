import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/gamification/level-badge';
import { LikeButton } from '@/components/feed/like-button';
import { DeletePostButton } from '@/components/feed/delete-post-button';
import { CommentSection } from '@/components/feed/comment-section';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import type { VideoEmbed } from '@/lib/video-utils';
import { translatePostForUser, translateCommentsForUser } from '@/lib/translation';

interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

function renderContent(content: unknown): string {
  try {
    return generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit]);
  } catch {
    return '<p>Unable to display content</p>';
  }
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const { id } = await params;

  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, image: true, level: true, role: true },
      },
      category: {
        select: { id: true, name: true, color: true },
      },
      _count: {
        select: { comments: true, likes: true },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id;
  const isAuthor = currentUserId === post.authorId;

  // Check if current user has liked the post
  let isLiked = false;
  if (currentUserId) {
    const like = await db.postLike.findFirst({
      where: { postId: id, userId: currentUserId },
    });
    isLiked = !!like;
  }

  // Fetch comments
  const comments = await db.comment.findMany({
    where: { postId: id },
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Get user's language preference for translation
  const userLanguage = currentUserId
    ? (await db.user.findUnique({
      where: { id: currentUserId },
      select: { languageCode: true },
    }))?.languageCode || 'en'
    : 'en';

  // Translate post and comments to user's preferred language
  const translatedPost = await translatePostForUser({
    id: post.id,
    title: post.title,
    plainText: post.plainText,
    languageCode: post.languageCode,
  }, userLanguage);

  const translatedComments = await translateCommentsForUser(
    comments.map((c) => ({
      id: c.id,
      content: c.content,
      languageCode: c.languageCode,
    })),
    userLanguage
  );

  // Create a map for translated comment content
  const translatedContentMap = new Map<string, string>();
  translatedComments.forEach((c) => {
    translatedContentMap.set(c.id, c.content);
  });

  const formattedComments = comments.map((comment) => ({
    id: comment.id,
    content: translatedContentMap.get(comment.id) || comment.content,
    authorId: comment.authorId,
    authorName: comment.author.name,
    authorImage: comment.author.image,
    createdAt: comment.createdAt,
  }));

  const embeds = (post.embeds as unknown as VideoEmbed[]) || [];
  const gifs = (post.gifs as unknown as string[]) || [];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        href="/feed"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Feed
      </Link>

      {/* Post card */}
      <article className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5">
          {/* Header: Avatar, Name, Time, Category, Bell, Menu */}
          <div className="flex items-start justify-between mb-4">
            <Link href={`/members/${post.author.id}`} className="flex items-center gap-3 group">
              <div className="relative">
                <Avatar src={post.author.image} name={post.author.name} size="md" />
                <LevelBadge level={post.author.level} size="sm" className="absolute -bottom-1 -right-1" />
              </div>
              <div>
                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {post.author.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: false })} ago</span>
                  {post.category && (
                    <>
                      <span>·</span>
                      <span className="text-blue-600 hover:underline">{post.category.name}</span>
                    </>
                  )}
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {/* Three-dot menu */}
              <button className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Post title */}
          {(translatedPost.title || post.title) && (
            <h1 className="text-xl font-bold text-gray-900 mb-2">{translatedPost.title || post.title}</h1>
          )}

          {/* Post content */}
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />

          {/* Video embeds */}
          {embeds.length > 0 && (
            <div className="mt-4 space-y-3">
              {embeds.map((embed, i) => (
                <div key={`${embed.service}-${embed.id}-${i}`} className="rounded-lg overflow-hidden">
                  <VideoEmbedPlayer embed={embed} />
                </div>
              ))}
            </div>
          )}

          {/* GIF attachments */}
          {gifs.length > 0 && (
            <div className="mt-4 space-y-3">
              {gifs.map((gifUrl, i) => (
                <div key={`gif-${i}`} className="rounded-lg overflow-hidden">
                  <img
                    src={gifUrl}
                    alt={`GIF ${i + 1}`}
                    className="w-full rounded-lg"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Like button */}
            <LikeButton
              targetId={post.id}
              targetType="post"
              initialLiked={isLiked}
              initialCount={post._count.likes}
            />

            {/* Comment count */}
            <div className="flex items-center gap-1.5 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z"
                />
              </svg>
              <span className="text-sm">{post._count.comments} comments</span>
            </div>
          </div>

          {/* Author actions */}
          {isAuthor && (
            <div className="flex items-center gap-4">
              <Link
                href={`/feed/${id}/edit`}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
              >
                Edit Post
              </Link>
              <DeletePostButton postId={id} />
            </div>
          )}
        </div>

        {/* Comment input section - inside the card */}
        <div className="px-5 py-4 border-t border-gray-100">
          <CommentSection
            postId={post.id}
            currentUserId={currentUserId}
            userImage={session?.user?.image}
            comments={formattedComments}
          />
        </div>
      </article>
    </div>
  );
}
