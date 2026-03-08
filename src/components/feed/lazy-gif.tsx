'use client';

import Link from 'next/link';

interface LazyGifProps {
    /** JPEG thumbnail URL (for feed) or actual GIF URL (for detail) */
    src: string;
    alt: string;
    /** Post ID for navigation link */
    postId: string;
    /** 'feed' = show JPEG thumbnail with play overlay + badge, click → detail page.
     *  'detail' = render actual GIF, auto-plays. */
    mode?: 'feed' | 'detail';
}

/**
 * LazyGif component for zero-download feed performance.
 *
 * Feed mode: renders ONLY a static JPEG thumbnail with play overlay and GIF badge.
 *            The actual GIF URL is NOT in the DOM. Click navigates to post detail.
 *
 * Detail mode: renders the actual GIF as a normal <img> that auto-plays.
 */
export function LazyGif({ src, alt, postId, mode = 'feed' }: LazyGifProps) {
    // Detail mode — render actual GIF, auto-plays
    if (mode === 'detail') {
        return (
            <img
                src={src}
                alt={alt}
                className="w-full rounded-lg"
            />
        );
    }

    // Feed mode — JPEG thumbnail only, navigate to detail on click
    return (
        <Link
            href={`/feed/${postId}`}
            className="relative w-full rounded-lg overflow-hidden group block"
            aria-label={`View GIF: ${alt}`}
        >
            {/* Static JPEG thumbnail — NO GIF in the DOM */}
            <img
                src={src}
                alt={alt}
                className="w-full rounded-lg"
                loading="lazy"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/35 group-hover:bg-black/50 transition-colors rounded-lg" />

            {/* Centered play button */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/90 dark:bg-white/85 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <svg
                        className="w-6 h-6 text-gray-900 ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                </div>
            </div>

            {/* GIF badge — top-right corner */}
            <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-black/60 text-white backdrop-blur-sm border border-white/20">
                    GIF
                </span>
            </div>
        </Link>
    );
}
