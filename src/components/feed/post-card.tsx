'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import { Avatar } from '@/components/ui/avatar';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import { LazyGif } from '@/components/feed/lazy-gif';
import { LikeButton } from '@/components/feed/like-button';
import { PostMenu } from '@/components/feed/post-menu';
import { AuthorBadgeRow } from '@/components/gamification/author-badge-row';
import { getLanguageName, getToggleLabel } from '@/lib/translation/constants';
import { renderTextWithMentions } from '@/components/ui/mention-chip';
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
  const gifThumbnails = ((post as unknown as { gifThumbnails: unknown }).gifThumbnails as string[]) || [];
  const images = (post.images as unknown as string[]) || [];

  // Determine if this post was translated
  const postLanguage = originalLanguage || (post as { languageCode?: string }).languageCode || 'en';
  // Check that translation actually changed the content — when budget/API
  // fails, translateForUser returns the original text unchanged.
  const hasActualTranslation =
    (!!translatedPlainText && translatedPlainText !== originalPlainText) ||
    (!!translatedTitle && translatedTitle !== originalTitle);
  const isTranslated = hasActualTranslation &&
    !!userLanguage &&
    postLanguage !== userLanguage;

  // Determine which text to display
  const displayTitle = isTranslated && !showOriginal
    ? (translatedTitle || post.title)
    : (originalTitle || post.title);

  const displayPlainText = isTranslated && !showOriginal
    ? translatedPlainText
    : null; // When showing original, fall through to rich Tiptap content

  // Show plain text only when displaying a translation (not original)
  const shouldShowPlainText = isTranslated && !showOriginal && displayPlainText;

  return (
    <article className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
      <div className="p-5">
        {/* Header: Avatar, Name, Date, Menu */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href={`/members/${post.author.id}`} className="flex items-center gap-3 group">
              <Avatar src={post.author.image} name={post.author.name} size="md" />
              <div>
                <div className="font-medium text-gray-900 dark:text-neutral-100 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                  <span>{post.author.name}</span>
                  {post.author._count?.badges ? (
                    <AuthorBadgeRow
                      authorId={post.author.id}
                      badges={post.author.badges ?? []}
                      totalBadges={post.author._count.badges}
                    />
                  ) : null}
                </div>
                <div className="text-sm text-gray-500 dark:text-neutral-400">
                  {format(new Date(post.createdAt), 'MMM d, yyyy', { locale: enUS })}
                </div>
              </div>
            </Link>
          </div>

          {/* Three-dot menu */}
          <PostMenu postId={post.id} isAuthor={!!currentUserId && currentUserId === post.authorId} />
        </div>

        {/*
          Post content wrapper — data-no-translate prevents GlobalTranslator from
          touching post content. Server-side translation already handles posts;
          the GlobalTranslator is only for UI elements (nav, buttons, etc.).
        */}
        <div data-no-translate>
          {/* Post title */}
          {displayTitle && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">
              {displayTitle}
            </h3>
          )}

          {/* Post content - show translated plain text or original rich content */}
          {shouldShowPlainText ? (
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
              {renderTextWithMentions(displayPlainText)}
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-gray-700 dark:text-neutral-300"
              dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
            />
          )}
        </div>

        {/* Uploaded Images */}
        {images.length > 0 && (
          <div className="mt-4 space-y-3">
            {images.map((image, i) => (
              <div key={`img-${i}`} className="rounded-lg overflow-hidden border border-gray-100 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-900 cursor-pointer" onClick={() => window.open(image, '_blank')}>
                <img
                  src={image}
                  alt={`Post attachment ${i + 1}`}
                  className="w-full max-h-[500px] object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Video embeds — feed mode: thumbnail only, no iframe */}
        {embeds.length > 0 && (
          <div className="mt-4 space-y-3">
            {embeds.map((embed, i) => (
              <div key={`${embed.service}-${embed.id}-${i}`} className="rounded-lg overflow-hidden">
                <VideoEmbedPlayer embed={embed} feedMode postId={post.id} />
              </div>
            ))}
          </div>
        )}

        {/* GIF attachments — feed mode: JPEG thumbnail only, NO GIF in DOM */}
        {gifs.length > 0 && (
          <div className="mt-4 space-y-3">
            {gifs.map((gifUrl, i) => {
              // Use JPEG thumbnail if available, fall back to GIF URL for pre-migration posts
              const thumbnailSrc = gifThumbnails[i] || gifUrl;
              return (
                <div key={`gif-${i}`} className="rounded-lg overflow-hidden">
                  <LazyGif
                    src={thumbnailSrc}
                    alt={`GIF ${i + 1}`}
                    postId={post.id}
                    mode="feed"
                  />
                </div>
              );
            })}
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

        {/* Original toggle - switch between translation and original text */}
        {isTranslated && (
          <button
            data-no-translate
            onClick={() => setShowOriginal(!showOriginal)}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title={
              showOriginal
                ? 'Show translation'
                : `Show original (${getLanguageName(postLanguage)})`
            }
          >
            <span className="text-sm">🌐</span>
            <span className="text-sm" translate="no">
              {getToggleLabel(userLanguage || 'en', showOriginal)}
            </span>
          </button>
        )}

      </div>
    </article>
  );
}
