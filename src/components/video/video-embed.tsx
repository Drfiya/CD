'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getEmbedUrl, getThumbnailUrl, type VideoEmbed } from '@/lib/video-utils';

interface VideoEmbedProps {
  embed: VideoEmbed;
  /** When true, immediately loads the iframe without showing thumbnail (detail page) */
  autoPlay?: boolean;
  /** When true, renders only a static thumbnail with play overlay — no iframe at all.
   *  Click navigates to the post detail page. Used in feed list view. */
  feedMode?: boolean;
  /** Post ID for the navigation link when feedMode is true */
  postId?: string;
}

export function VideoEmbedPlayer({ embed, autoPlay = false, feedMode = false, postId }: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  useEffect(() => {
    // If the embed has a cached Supabase thumbnail, use that first
    if (embed.thumbnailUrl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync prop→state for cached thumbnail; async Loom fetch below needs effect
      setThumbnailUrl(embed.thumbnailUrl);
      return;
    }

    // Fetch Loom thumbnail from oEmbed API
    if (embed.service === 'loom') {
      const fetchLoomThumbnail = async () => {
        try {
          const oEmbedUrl = `https://www.loom.com/v1/oembed?url=${encodeURIComponent(embed.url)}`;
          const response = await fetch(oEmbedUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.thumbnail_url) {
              setThumbnailUrl(data.thumbnail_url);
              return;
            }
          }
          setThumbnailError(true);
        } catch {
          setThumbnailError(true);
        }
      };
      fetchLoomThumbnail();
    } else {
      // For YouTube/Vimeo, use the static thumbnail URL
      setThumbnailUrl(getThumbnailUrl(embed));
    }
  }, [embed]);

  // Playing state — render iframe (only possible when NOT in feedMode)
  if (isPlaying && !feedMode) {
    return (
      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black">
        <iframe
          src={getEmbedUrl(embed)}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          title={`${embed.service} video`}
        />
      </div>
    );
  }

  // Thumbnail content (shared between feed and non-feed modes)
  const thumbnailContent = (
    <>
      {/* Thumbnail image */}
      {thumbnailUrl && !thumbnailError ? (
        <Image
          src={thumbnailUrl}
          alt={`${embed.service} video thumbnail`}
          fill
          className="object-cover"
          unoptimized // External URLs need unoptimized
          onError={() => setThumbnailError(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      )}

      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all">
          <svg
            className="w-6 h-6 text-gray-900 ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </>
  );

  // Feed mode — render as a Link that navigates to post detail (ZERO iframes)
  if (feedMode && postId) {
    return (
      <Link
        href={`/feed/${postId}`}
        className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-900 group block"
      >
        {thumbnailContent}
      </Link>
    );
  }

  // Non-feed mode (detail page without autoPlay) — click to play inline
  return (
    <button
      type="button"
      onClick={() => setIsPlaying(true)}
      className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-900 group cursor-pointer"
    >
      {thumbnailContent}
    </button>
  );
}
