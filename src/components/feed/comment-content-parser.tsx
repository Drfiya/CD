'use client';

import type { ReactNode } from 'react';
import { UGCText } from '@/components/translation/UGCText';

/**
 * Renders rich embedded content inside a comment body:
 *   - [GIF: url]           → inline image
 *   - [YouTube Video: url] / [Vimeo Video: url] / [Loom Video: url] / [Video: url]
 *                          → "Watch Video" link
 *   - [Attached: filename] → attachment chip
 *
 * Everything else is plain text wrapped in <UGCText> for translation pass-through.
 * Extracted from the original comment-section.tsx so the thread tree and the
 * input form can compose the parser without duplicating ~130 lines of regex
 * sequencing.
 */
export function CommentContent({ content }: { content: string }) {
  const parts: ReactNode[] = [];
  let keyIndex = 0;

  const allMatches: Array<{
    start: number;
    end: number;
    type: 'gif' | 'video' | 'attachment';
    url: string;
  }> = [];

  let match: RegExpExecArray | null;

  const gifRegex = /\[GIF:\s*(https?:\/\/[^\]]+)\]/g;
  while ((match = gifRegex.exec(content)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, type: 'gif', url: match[1] });
  }

  const videoRegex = /\[(?:YouTube|Vimeo|Loom|Video)\s*Video?:\s*(https?:\/\/[^\]]+)\]/gi;
  while ((match = videoRegex.exec(content)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, type: 'video', url: match[1] });
  }

  const attachRegex = /\[Attached:\s*([^\]]+)\]/g;
  while ((match = attachRegex.exec(content)) !== null) {
    allMatches.push({ start: match.index, end: match.index + match[0].length, type: 'attachment', url: match[1] });
  }

  allMatches.sort((a, b) => a.start - b.start);

  let lastEnd = 0;
  for (const m of allMatches) {
    if (m.start > lastEnd) {
      const textBefore = content.slice(lastEnd, m.start).trim();
      if (textBefore) {
        parts.push(<span key={keyIndex++}>{textBefore} </span>);
      }
    }

    if (m.type === 'gif') {
      parts.push(
        <div key={keyIndex++} className="mt-2 max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.url} alt="GIF" className="rounded-lg max-w-full h-auto" loading="lazy" />
        </div>
      );
    } else if (m.type === 'video') {
      parts.push(
        <a
          key={keyIndex++}
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center gap-2 text-blue-600 hover:underline text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
          </svg>
          Watch Video
        </a>
      );
    } else if (m.type === 'attachment') {
      parts.push(
        <span key={keyIndex++} className="inline-flex items-center gap-1 text-gray-600 dark:text-neutral-300 text-sm bg-gray-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
          </svg>
          {m.url}
        </span>
      );
    }

    lastEnd = m.end;
  }

  if (lastEnd < content.length) {
    const remainingText = content.slice(lastEnd).trim();
    if (remainingText) {
      parts.push(<span key={keyIndex++}>{remainingText}</span>);
    }
  }

  if (parts.length === 0) {
    return <UGCText as="p" className="text-sm text-gray-700 dark:text-neutral-300 mt-0.5">{content}</UGCText>;
  }

  return <UGCText as="div" className="text-sm text-gray-700 dark:text-neutral-300 mt-0.5">{parts}</UGCText>;
}
