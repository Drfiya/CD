'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PostEditor } from './post-editor';
import { VideoInput } from '@/components/video/video-input';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import { GifPicker } from '@/components/ui/gif-picker';
import { createPost } from '@/lib/post-actions';
import type { VideoEmbed } from '@/types/post';
import type { MediaUpload } from '@/lib/media-actions';
import { Avatar } from '@/components/ui/avatar';

interface Category {
    id: string;
    name: string;
    color: string;
}

interface CreatePostModalProps {
    categories: Category[];
    userImage?: string | null;
    userName?: string | null;
    writeSomethingPlaceholder?: string;
}

// Category color map for the pill buttons
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
    General: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
    Announcements: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
    Introductions: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
    Questions: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
};

export function CreatePostModal({ categories, userImage, userName, writeSomethingPlaceholder }: CreatePostModalProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<object | null>(null);
    const [embeds, setEmbeds] = useState<VideoEmbed[]>([]);
    const [images, setImages] = useState<MediaUpload[]>([]);
    const [gifs, setGifs] = useState<string[]>([]);
    const [showGifPicker, setShowGifPicker] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPendingVideo, setHasPendingVideo] = useState(false);

    // Set default category when modal opens
    useEffect(() => {
        if (isOpen && categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [isOpen, categories, selectedCategory]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!content) return;

        setIsSubmitting(true);
        setError(null);

        const formData = new FormData();
        formData.set('title', title);
        formData.set('content', JSON.stringify(content));
        formData.set('embeds', JSON.stringify(embeds));
        formData.set('images', JSON.stringify(images.map(img => img.url)));
        formData.set('gifs', JSON.stringify(gifs));
        if (selectedCategory) {
            formData.set('categoryId', selectedCategory);
        }

        const result = await createPost(formData);

        if ('error' in result) {
            setError(typeof result.error === 'string' ? result.error : 'An error occurred');
            setIsSubmitting(false);
            return;
        }

        // Success - close modal and refresh
        setIsOpen(false);
        setTitle('');
        setContent(null);
        setEmbeds([]);
        setImages([]);
        setGifs([]);
        setSelectedCategory(null);
        setIsSubmitting(false);
        router.refresh();
    };

    const removeEmbed = (index: number) => {
        setEmbeds(embeds.filter((_, i) => i !== index));
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const removeGif = (index: number) => {
        setGifs(gifs.filter((_, i) => i !== index));
    };

    const getCategoryStyle = (categoryName: string) => {
        return categoryColors[categoryName] || categoryColors.General;
    };

    return (
        <>
            {/* Trigger - "Write something..." prompt with action row */}
            <div
                onClick={() => setIsOpen(true)}
                className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 cursor-pointer hover:border-gray-300 dark:hover:border-neutral-600 transition-colors"
            >
                {/* Top row: avatar + placeholder */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <Avatar src={userImage} name={userName} size="sm" />
                    <div className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-neutral-700 rounded-full text-gray-500 dark:text-neutral-400 text-sm">
                        {writeSomethingPlaceholder || 'Write something...'}
                    </div>
                </div>

                {/* Bottom row: attachment icons + Post button */}
                <div className="flex items-center justify-end px-4 py-3 border-t border-gray-100 dark:border-neutral-700">
                    <button
                        type="button"
                        className="inline-flex items-center px-5 py-2 bg-white dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 text-sm font-semibold tracking-wide rounded-full border border-gray-200 dark:border-neutral-600 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-700"
                        style={{ borderBottom: '2.5px solid #D94A4A' }}
                    >
                        Post
                    </button>
                </div>
            </div>

            {/* Modal overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Modal content */}
                    <div className="relative bg-white dark:bg-neutral-800 rounded-xl w-full max-w-lg mx-4 shadow-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-neutral-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Create New Post</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-5 space-y-5">
                                {/* Category selection */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map((category) => {
                                            const style = getCategoryStyle(category.name);
                                            const isSelected = selectedCategory === category.id;
                                            return (
                                                <button
                                                    key={category.id}
                                                    type="button"
                                                    onClick={() => setSelectedCategory(category.id)}
                                                    className={`
                            px-4 py-1.5 rounded-full text-sm font-medium border transition-all
                            ${isSelected
                                                            ? `${style.bg} ${style.text} ${style.border}`
                                                            : 'bg-white dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-600 hover:border-gray-300'
                                                        }
                          `}
                                                >
                                                    {category.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Post Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Post Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Enter a title for your post (optional)"
                                        maxLength={200}
                                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-neutral-700 rounded-lg text-gray-900 dark:text-neutral-100 bg-white dark:bg-neutral-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 transition-colors"
                                    />
                                </div>

                                {/* Content */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Content *</label>
                                    <div className="border border-gray-200 dark:border-neutral-700 rounded-lg">
                                        <PostEditor
                                            onChange={(json) => setContent(json)}
                                            placeholder="What would you like to share?"
                                        />
                                    </div>
                                </div>

                                {/* Media thumbnails (videos, images, and GIFs) */}
                                {(embeds.length > 0 || images.length > 0 || gifs.length > 0) && (
                                    <div className="flex flex-wrap gap-2">
                                        {/* Video thumbnails */}
                                        {embeds.map((embed, i) => (
                                            <div key={`${embed.service}-${embed.id}-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-8 h-8">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                                    </svg>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmbed(i)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80 text-xs"
                                                    aria-label="Remove video"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                        {/* Image thumbnails */}
                                        {images.map((image, i) => (
                                            <div key={`image-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                                <img
                                                    src={image.url}
                                                    alt={`Uploaded image ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80 text-xs"
                                                    aria-label="Remove image"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                        {/* GIF thumbnails */}
                                        {gifs.map((gif, i) => (
                                            <div key={`gif-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                                                <img
                                                    src={gif}
                                                    alt={`GIF ${i + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeGif(i)}
                                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-black/80 text-xs"
                                                    aria-label="Remove GIF"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {error && (
                                    <p className="text-sm text-red-600">{error}</p>
                                )}
                            </div>

                            {/* Footer with action buttons */}
                            <div className="p-5 border-t border-gray-100 dark:border-neutral-700 space-y-3">
                                {/* Media inputs row */}
                                <div className="flex items-center gap-2">
                                    {/* Video/Image input */}
                                    <VideoInput
                                        onAddVideo={(embed) => setEmbeds([...embeds, embed])}
                                        onAddImage={(image) => setImages([...images, image])}
                                        onPendingChange={setHasPendingVideo}
                                        disabled={isSubmitting}
                                        compact
                                    />

                                    {/* GIF button */}
                                    <button
                                        type="button"
                                        onClick={() => setShowGifPicker(true)}
                                        disabled={isSubmitting}
                                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                                    >
                                        <span className="text-base">🎬</span>
                                        GIF
                                    </button>
                                </div>

                                {/* Action buttons row */}
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="px-5 py-2 rounded-full text-sm font-medium text-gray-700 dark:text-neutral-300 border border-gray-300 dark:border-neutral-600 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || !content || hasPendingVideo}
                                        className="px-5 py-2 rounded-full text-sm font-medium text-white bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isSubmitting ? 'Posting...' : 'Post'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* GIF Picker Modal */}
            {showGifPicker && (
                <GifPicker
                    onSelect={(gifUrl) => {
                        setGifs([...gifs, gifUrl]);
                        setShowGifPicker(false);
                    }}
                    onClose={() => setShowGifPicker(false)}
                />
            )}
        </>
    );
}
