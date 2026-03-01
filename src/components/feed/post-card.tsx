'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { Avatar } from '@/components/ui/avatar';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import { LikeButton } from '@/components/feed/like-button';
import { PostMenu } from '@/components/feed/post-menu';
import { getLanguageName } from '@/lib/translation/constants';
import type { PostWithAuthor } from '@/types/post';
import type { VideoEmbed } from '@/lib/video-utils';

interface PostCardProps {
  post: PostWithAuthor;
  showActions?: boolean;
  currentUserId?: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  category?: { id: string; name: string; color: string } | null;
  translatedPlainText?: string;
  translatedTitle?: string;
  originalPlainText?: string;
  originalTitle?: string;
  originalLanguage?: string;
  userLanguage?: string;
}

function renderContent(content: unknown): string {
  try {
    // Tiptap content is stored as JSON, convert to HTML for display
    return generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit]);
  } catch {
    // Fallback for invalid content
    return '<p>Unable to display content</p>';
  }
}

export function PostCard({
  post,
  showActions = false,
  currentUserId,
  likeCount = 0,
  commentCount = 0,
  isLiked = false,
  translatedPlainText,
  translatedTitle,
  originalPlainText,
  originalTitle,
  originalLanguage,
  userLanguage,
}: PostCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);

  // Prisma Json fields need cast through unknown for type safety
  const embeds = (post.embeds as unknown as VideoEmbed[]) || [];
  const gifs = (post.gifs as unknown as string[]) || [];

  // Determine if this post was translated
  const postLanguage = originalLanguage || (post as { languageCode?: string }).languageCode || 'en';
  const isTranslated = !!translatedPlainText &&
    !!userLanguage &&
    postLanguage !== userLanguage;

  // Determine which text to display
  const displayTitle = isTranslated && !showOriginal
    ? (translatedTitle || post.title)
    : (originalTitle || post.title);

  const displayPlainText = isTranslated && !showOriginal
    ? translatedPlainText
    : originalPlainText;

  const shouldShowPlainText = isTranslated && displayPlainText;

  return (
    <article className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
      <div className="p-5">
        {/* Header: Avatar, Name, Date, Menu */}
        <div className="flex items-start justify-between mb-3">
          <Link href={`/members/${post.author.id}`} className="flex items-center gap-3 group">
            <Avatar src={post.author.image} name={post.author.name} size="md" />
            <div>
              <div className="font-medium text-gray-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors">
                {post.author.name}
              </div>
              <div className="text-sm text-gray-500 dark:text-neutral-400">
                {format(new Date(post.createdAt), 'MMM d, yyyy', { locale: enUS })}
              </div>
            </div>
          </Link>

          {/* Three-dot menu */}
          <PostMenu postId={post.id} isAuthor={!!currentUserId && currentUserId === post.authorId} />
        </div>

        {/* Post title (if present) */}
        {displayTitle && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">{displayTitle}</h3>
        )}

        {/* Post content - show translated plain text or original rich content */}
        {shouldShowPlainText ? (
          <div className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
            {displayPlainText}
          </div>
        ) : (
          <div
            className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />
        )}

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

      {/* Footer: Like, Comment, Trues */}
      <div className="px-5 py-3 border-t border-gray-100 dark:border-neutral-700 flex items-center gap-6">
        {/* Like button */}
        <LikeButton
          targetId={post.id}
          targetType="post"
          initialLiked={isLiked}
          initialCount={likeCount}
        />

        {/* Comment count */}
        <Link
          href={`/feed/${post.id}`}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
        >
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
          <span className="text-sm">{commentCount}</span>
        </Link>

        {/* Trues button - only shown when translation exists */}
        {isTranslated && (
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={
              showOriginal
                ? 'Show translation'
                : `Show original (${getLanguageName(postLanguage)})`
            }
          >
            <span className="text-sm">🌐</span>
            <span className="text-sm">
              {showOriginal ? 'Translated' : 'Trues'}
            </span>
          </button>
        )}

      </div>
    </article>
  );
}
