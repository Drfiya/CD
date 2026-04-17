'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ui/avatar';
import { GifPicker } from '@/components/ui/gif-picker';
import { createComment } from '@/lib/comment-actions';
import { UGCText } from '@/components/translation/UGCText';
import dynamic from 'next/dynamic';

// Dynamic import for emoji picker to avoid SSR issues
const Picker = dynamic(() => import('@emoji-mart/react').then(mod => mod.default), {
    ssr: false,
    loading: () => <div className="w-[352px] h-[435px] bg-white border rounded-lg flex items-center justify-center">Loading...</div>
});

interface Comment {
    id: string;
    content: string;
    authorId: string;
    authorName: string | null;
    authorImage: string | null;
    createdAt: Date;
}

interface CommentSectionProps {
    postId: string;
    currentUserId?: string;
    userImage?: string | null;
    comments: Comment[];
}

export function CommentSection({ postId, currentUserId, userImage, comments }: CommentSectionProps) {
    return (
        <div className="space-y-4">
            {/* Comment input */}
            {currentUserId ? (
                <CommentInput postId={postId} userImage={userImage} />
            ) : (
                <div className="p-4 text-center bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                        <Link href="/login" className="text-blue-600 hover:underline">
                            Sign in
                        </Link>{' '}
                        to leave a comment
                    </p>
                </div>
            )}

            {/* Comments list */}
            {comments.length > 0 && (
                <div className="space-y-4 mt-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <Avatar src={comment.authorImage} name={comment.authorName} size="sm" />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm text-gray-900 dark:text-neutral-100">{comment.authorName || 'Anonymous'}</span>
                                    <span className="text-xs text-gray-500 dark:text-neutral-400">· {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: false })} ago</span>
                                </div>
                                <CommentContent content={comment.content} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Component to render rich content in comments (GIFs, videos, links, attachments)
function CommentContent({ content }: { content: string }) {
    // Parse different types of embedded content
    const parts: React.ReactNode[] = [];
    const remainingText = content;
    let keyIndex = 0;

    // Regex patterns for different content types
    const gifPattern = /\[GIF:\s*(https?:\/\/[^\]]+)\]/g;
    const videoPattern = /\[(YouTube|Vimeo|Loom|Video)\s*Video?:\s*(https?:\/\/[^\]]+)\]/gi;
    const attachmentPattern = /\[Attached:\s*([^\]]+)\]/g;
    const urlPattern = /(https?:\/\/[^\s\]]+)/g;

    // First pass: extract all patterns and their positions
    const allMatches: Array<{ start: number; end: number; type: string; content: string; url?: string }> = [];

    let match;

    // Find GIFs
    const gifRegex = /\[GIF:\s*(https?:\/\/[^\]]+)\]/g;
    while ((match = gifRegex.exec(content)) !== null) {
        allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'gif',
            content: match[0],
            url: match[1]
        });
    }

    // Find Videos
    const videoRegex = /\[(YouTube|Vimeo|Loom|Video)\s*Video?:\s*(https?:\/\/[^\]]+)\]/gi;
    while ((match = videoRegex.exec(content)) !== null) {
        allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'video',
            content: match[0],
            url: match[2]
        });
    }

    // Find Attachments
    const attachRegex = /\[Attached:\s*([^\]]+)\]/g;
    while ((match = attachRegex.exec(content)) !== null) {
        allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'attachment',
            content: match[0],
            url: match[1]
        });
    }

    // Sort by position
    allMatches.sort((a, b) => a.start - b.start);

    // Build parts array
    let lastEnd = 0;
    for (const m of allMatches) {
        // Add text before this match
        if (m.start > lastEnd) {
            const textBefore = content.slice(lastEnd, m.start).trim();
            if (textBefore) {
                parts.push(<span key={keyIndex++}>{textBefore} </span>);
            }
        }

        // Add the rich content
        if (m.type === 'gif' && m.url) {
            parts.push(
                <div key={keyIndex++} className="mt-2 max-w-xs">
                    <img
                        src={m.url}
                        alt="GIF"
                        className="rounded-lg max-w-full h-auto"
                        loading="lazy"
                    />
                </div>
            );
        } else if (m.type === 'video' && m.url) {
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
        } else if (m.type === 'attachment' && m.url) {
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

    // Add remaining text
    if (lastEnd < content.length) {
        const remainingText = content.slice(lastEnd).trim();
        if (remainingText) {
            parts.push(<span key={keyIndex++}>{remainingText}</span>);
        }
    }

    // If no matches found, just return plain text
    if (parts.length === 0) {
        return <UGCText as="p" className="text-sm text-gray-700 dark:text-neutral-300 mt-0.5">{content}</UGCText>;
    }

    return <UGCText as="div" className="text-sm text-gray-700 dark:text-neutral-300 mt-0.5">{parts}</UGCText>;
}

interface EmojiData {
    native: string;
}

function CommentInput({ postId, userImage }: { postId: string; userImage?: string | null }) {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Modal states
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showUrlModal, setShowUrlModal] = useState(false);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [showGifModal, setShowGifModal] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [gifSearch, setGifSearch] = useState('');

    // Refs for click outside detection
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close emoji picker when clicking outside
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
            const result = await createComment(postId, submittedContent.trim());

            if ('error' in result) {
                setContent(submittedContent);
                setError(typeof result.error === 'string' ? result.error : 'Failed to post comment');
                return;
            }

            router.refresh();
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    // Handle emoji selection
    const handleEmojiSelect = (emoji: EmojiData) => {
        setContent(prev => prev + emoji.native);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    // Handle file attachment
    const handleFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Append file name to comment (in a real app, you'd upload the file)
            setContent(prev => prev + (prev ? ' ' : '') + `[Attached: ${file.name}]`);
            inputRef.current?.focus();
        }
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Handle URL insertion
    const handleUrlInsert = () => {
        if (urlInput.trim()) {
            setContent(prev => prev + (prev ? ' ' : '') + urlInput.trim());
            setUrlInput('');
            setShowUrlModal(false);
            inputRef.current?.focus();
        }
    };

    // Handle video URL insertion
    const handleVideoInsert = () => {
        if (videoUrlInput.trim()) {
            // Extract video platform and format the link nicely
            let formattedLink = videoUrlInput.trim();
            if (formattedLink.includes('youtube.com') || formattedLink.includes('youtu.be')) {
                formattedLink = `[YouTube Video: ${formattedLink}]`;
            } else if (formattedLink.includes('vimeo.com')) {
                formattedLink = `[Vimeo Video: ${formattedLink}]`;
            } else if (formattedLink.includes('loom.com')) {
                formattedLink = `[Loom Video: ${formattedLink}]`;
            } else {
                formattedLink = `[Video: ${formattedLink}]`;
            }
            setContent(prev => prev + (prev ? ' ' : '') + formattedLink);
            setVideoUrlInput('');
            setShowVideoModal(false);
            inputRef.current?.focus();
        }
    };

    const handleGifSelect = (gifUrl: string) => {
        setContent(prev => prev + (prev ? ' ' : '') + `[GIF: ${gifUrl}]`);
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
                        {/* Hidden file input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx,.txt"
                        />

                        {/* Attachment icon */}
                        <button
                            type="button"
                            onClick={handleFileClick}
                            className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                            aria-label="Attach file"
                            title="Attach file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                            </svg>
                        </button>

                        {/* Link icon */}
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

                        {/* Video icon */}
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

                        {/* Emoji icon */}
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                            aria-label="Add emoji"
                            title="Add emoji"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                            </svg>
                        </button>

                        {/* GIF button */}
                        <button
                            type="button"
                            onClick={() => setShowGifModal(true)}
                            className="text-xs font-semibold hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                            aria-label="Add GIF"
                            title="Add GIF"
                        >
                            GIF
                        </button>

                        {/* Send button */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!content.trim() || isPending}
                            className={`transition-colors ${content.trim() && !isPending
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
                    </div>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div
                    ref={emojiPickerRef}
                    className="absolute bottom-full right-0 mb-2 z-50"
                >
                    <Picker
                        data={async () => (await import('@emoji-mart/data')).default}
                        onEmojiSelect={handleEmojiSelect}
                        theme="auto"
                        previewPosition="none"
                    />
                </div>
            )}

            {/* URL Modal */}
            {showUrlModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUrlModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">Add Link</h3>
                        <input
                            type="url"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="https://example.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlInsert()}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowUrlModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUrlInsert}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Insert Link
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Video Modal */}
            {showVideoModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowVideoModal(false)}>
                    <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">Add Video Link</h3>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">Paste a YouTube, Vimeo, or Loom video link</p>
                        <input
                            type="url"
                            value={videoUrlInput}
                            onChange={(e) => setVideoUrlInput(e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleVideoInsert()}
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowVideoModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVideoInsert}
                                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Insert Video
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GIF Modal - Using GIPHY-powered GifPicker */}
            {showGifModal && (
                <GifPicker
                    onSelect={handleGifSelect}
                    onClose={() => setShowGifModal(false)}
                />
            )}
        </div>
    );
}
