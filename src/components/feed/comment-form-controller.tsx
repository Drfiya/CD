'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Avatar } from '@/components/ui/avatar';
import { GifPicker } from '@/components/ui/gif-picker';
import { createComment } from '@/lib/comment-actions';
import { useCommentToasts } from './comment-toast-orchestrator';
import { UrlInsertModal, VideoInsertModal } from './comment-input-modals';

// Dynamic import for emoji picker to avoid SSR issues
const Picker = dynamic(() => import('@emoji-mart/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-[352px] h-[435px] bg-white border rounded-lg flex items-center justify-center">
      Loading...
    </div>
  ),
});

interface EmojiData {
  native: string;
}

export interface CommentInputProps {
  postId: string;
  userImage?: string | null;
  parentId?: string | null;
  onSubmitted?: () => void;
  compact?: boolean;
}

/** Tag a raw video URL with its platform prefix for downstream parsing. */
function formatVideoLink(raw: string): string {
  const url = raw.trim();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return `[YouTube Video: ${url}]`;
  if (url.includes('vimeo.com')) return `[Vimeo Video: ${url}]`;
  if (url.includes('loom.com')) return `[Loom Video: ${url}]`;
  return `[Video: ${url}]`;
}

/**
 * Controlled text + toolbar input for comment creation.
 *
 * Delegates celebration toast state to `useCommentToasts()`, the rich-body
 * embed handling to `CommentContent`, and the URL/video modals to
 * `comment-input-modals.tsx`. This controller is purely the "typing,
 * submitting, opening modals" surface.
 */
export function CommentInput({ postId, userImage, parentId, onSubmitted }: CommentInputProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showGifModal, setShowGifModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');

  const toasts = useCommentToasts();

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!content.trim()) return;

    const submittedContent = content;
    setContent('');
    setError(null);

    startTransition(async () => {
      const result = await createComment(postId, submittedContent.trim(), parentId ?? null);

      if ('error' in result) {
        setContent(submittedContent);
        setError(typeof result.error === 'string' ? result.error : 'Failed to post comment');
        return;
      }

      router.refresh();
      toasts.firePoints();
      if (result.leveledUp) toasts.fireLevelUp(result.leveledUp);
      if (result.streakMilestone) toasts.fireStreak(result.streakMilestone);
      if ('streakSaved' in result && result.streakSaved) toasts.fireStreakSaved(result.streakSaved);
      if (result.newBadges && result.newBadges.length > 0) {
        toasts.fireBadge(result.newBadges[result.newBadges.length - 1]);
      }

      onSubmitted?.();
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEmojiSelect = (emoji: EmojiData) => {
    setContent((prev) => prev + emoji.native);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setContent((prev) => prev + (prev ? ' ' : '') + `[Attached: ${file.name}]`);
      inputRef.current?.focus();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlInsert = () => {
    if (!urlInput.trim()) return;
    setContent((prev) => prev + (prev ? ' ' : '') + urlInput.trim());
    setUrlInput('');
    setShowUrlModal(false);
    inputRef.current?.focus();
  };

  const handleVideoInsert = () => {
    if (!videoUrlInput.trim()) return;
    setContent((prev) => prev + (prev ? ' ' : '') + formatVideoLink(videoUrlInput));
    setVideoUrlInput('');
    setShowVideoModal(false);
    inputRef.current?.focus();
  };

  const handleGifSelect = (gifUrl: string) => {
    setContent((prev) => prev + (prev ? ' ' : '') + `[GIF: ${gifUrl}]`);
    setShowGifModal(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-3">
        <div className="flex items-center gap-3">
          <Avatar src={userImage} name="You" size="sm" />
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your comment"
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-neutral-200 placeholder:text-gray-400 dark:placeholder:text-neutral-500"
            disabled={isPending}
          />
          <div className="flex items-center gap-2 text-gray-400 dark:text-neutral-500">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Attach file"
              title="Attach file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowUrlModal(true)}
              className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Add link"
              title="Add link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowVideoModal(true)}
              className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Add video"
              title="Add video link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowEmojiPicker((v) => !v)}
              className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Add emoji"
              title="Add emoji"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => setShowGifModal(true)}
              className="text-xs font-semibold hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
              aria-label="Add GIF"
              title="Add GIF"
            >
              GIF
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!content.trim() || isPending}
                className={`transition-colors ${
                  content.trim() && !isPending
                    ? 'hover:text-gray-600 dark:hover:text-neutral-300 cursor-pointer'
                    : 'opacity-40 cursor-default'
                }`}
                aria-label="Send comment"
                title="Send comment"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
              <toasts.Toasts />
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
          <Picker
            data={async () => (await import('@emoji-mart/data')).default}
            onEmojiSelect={handleEmojiSelect}
            theme="auto"
            previewPosition="none"
          />
        </div>
      )}

      {showUrlModal && (
        <UrlInsertModal
          value={urlInput}
          onChange={setUrlInput}
          onClose={() => setShowUrlModal(false)}
          onInsert={handleUrlInsert}
        />
      )}

      {showVideoModal && (
        <VideoInsertModal
          value={videoUrlInput}
          onChange={setVideoUrlInput}
          onClose={() => setShowVideoModal(false)}
          onInsert={handleVideoInsert}
        />
      )}

      {showGifModal && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGifModal(false)} />}
    </div>
  );
}
