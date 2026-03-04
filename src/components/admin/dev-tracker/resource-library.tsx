'use client';

/**
 * Dev Tracker Resource Library — Client component.
 * Drag-and-drop file uploads + manual text entries (prompts, links, notes).
 * Supports image & YouTube video media attachments on any resource.
 */

import { useState, useTransition, useCallback, useRef } from 'react';
import {
    addResource,
    updateResource,
    deleteResource,
} from '@/lib/dev-tracker/actions';
import { uploadResourceFiles, uploadResourceMedia } from '@/lib/dev-tracker/upload-actions';
import { parseVideoUrl } from '@/lib/video-utils';
import { VideoEmbedPlayer } from '@/components/video/video-embed';

// --- Types ---

interface MediaItem {
    type: 'image' | 'video';
    url: string;
    linkUrl?: string;
    filename?: string;
    service?: string;
    videoId?: string;
}

interface Resource {
    id: string;
    type: 'PROMPT' | 'LINK' | 'NOTE' | 'FILE';
    title: string;
    content: string;
    readme: string | null;
    starred: boolean;
    useCount: number;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    media: unknown; // Prisma Json — cast to MediaItem[] at usage
    createdAt: Date;
    createdBy: { name: string | null };
}

interface ResourceLibraryProps {
    initialResources: Resource[];
    userId: string;
}

// --- Helpers ---

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(mimeType: string | null): string {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('gzip')) return '📦';
    if (mimeType.startsWith('text/')) return '📃';
    return '📄';
}

function getTypeIcon(type: string): string {
    switch (type) {
        case 'PROMPT': return '📋';
        case 'LINK': return '🔗';
        case 'NOTE': return '📝';
        case 'FILE': return '📁';
        default: return '📄';
    }
}

// --- Tab config ---

const TABS = [
    { id: 'ALL' as const, label: 'All' },
    { id: 'FILE' as const, label: '📁 Files' },
    { id: 'PROMPT' as const, label: '📋 Prompts' },
    { id: 'LINK' as const, label: '🔗 Links' },
    { id: 'NOTE' as const, label: '📝 Notes' },
];

// --- Image Lightbox ---

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                aria-label="Close"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// --- Media editor (shared between Add & Edit) ---

function MediaEditor({
    media,
    onChange,
}: {
    media: MediaItem[];
    onChange: (media: MediaItem[]) => void;
}) {
    const [videoUrl, setVideoUrl] = useState('');
    const [videoError, setVideoError] = useState('');
    const [uploading, setUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const images = media.filter((m) => m.type === 'image');
    const videos = media.filter((m) => m.type === 'video');

    const handleImageUpload = async (files: FileList) => {
        setUploading(true);
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append('media', f));

        try {
            const { results } = await uploadResourceMedia(formData);
            const newImages: MediaItem[] = results
                .filter((r) => r.success)
                .map((r) => ({ type: 'image' as const, url: r.url, filename: r.filename }));
            onChange([...media, ...newImages]);
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleAddVideo = () => {
        setVideoError('');
        const parsed = parseVideoUrl(videoUrl.trim());
        if (!parsed) {
            setVideoError('Invalid YouTube/Vimeo/Loom URL');
            return;
        }
        const newVideo: MediaItem = {
            type: 'video',
            url: parsed.url,
            service: parsed.service,
            videoId: parsed.id,
        };
        onChange([...media, newVideo]);
        setVideoUrl('');
    };

    const handleRemove = (index: number) => {
        onChange(media.filter((_, i) => i !== index));
    };

    const handleImageLinkChange = (index: number, linkUrl: string) => {
        onChange(media.map((m, i) => (i === index ? { ...m, linkUrl } : m)));
    };

    return (
        <div className="space-y-3 border border-gray-200 dark:border-neutral-600 rounded-lg p-3 bg-gray-50/50 dark:bg-neutral-700/30">
            <p className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">Media Attachments</p>

            {/* Image upload */}
            <div>
                <input
                    ref={imageInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) handleImageUpload(e.target.files);
                        e.target.value = '';
                    }}
                />
                <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                    </svg>
                    {uploading ? 'Uploading…' : 'Add Images'}
                </button>
            </div>

            {/* Image previews */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((img, idx) => {
                        const globalIdx = media.indexOf(img);
                        return (
                            <div key={idx} className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={img.url}
                                    alt={img.filename || 'Image'}
                                    className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-neutral-600"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleRemove(globalIdx)}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Remove"
                                >
                                    ✕
                                </button>
                                <input
                                    type="url"
                                    value={img.linkUrl || ''}
                                    onChange={(e) => handleImageLinkChange(globalIdx, e.target.value)}
                                    placeholder="Link URL (optional)"
                                    className="mt-1 w-full px-1.5 py-0.5 text-[10px] border border-gray-200 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 dark:text-neutral-200 outline-none focus:ring-1 focus:ring-gray-400"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Video URL input */}
            <div className="flex gap-2">
                <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => { setVideoUrl(e.target.value); setVideoError(''); }}
                    placeholder="YouTube/Vimeo/Loom URL"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 dark:text-neutral-100 outline-none focus:ring-1 focus:ring-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddVideo())}
                />
                <button
                    type="button"
                    onClick={handleAddVideo}
                    disabled={!videoUrl.trim()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </button>
            </div>
            {videoError && <p className="text-xs text-red-500">{videoError}</p>}

            {/* Video list */}
            {videos.length > 0 && (
                <div className="space-y-1.5">
                    {videos.map((vid, idx) => {
                        const globalIdx = media.indexOf(vid);
                        return (
                            <div key={idx} className="flex items-center gap-2 bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 rounded-lg px-2.5 py-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400 shrink-0">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                                </svg>
                                <span className="text-xs text-gray-700 dark:text-neutral-300 truncate flex-1">{vid.url}</span>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(globalIdx)}
                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                    title="Remove"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Drag-and-drop upload zone ---

function DropZone({
    userId,
    onUploaded,
}: {
    userId: string;
    onUploaded: () => void;
}) {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFiles = useCallback(
        async (files: FileList | File[]) => {
            if (files.length === 0) return;

            setUploading(true);
            setUploadProgress([]);

            const formData = new FormData();
            const fileArray = Array.from(files);

            for (const file of fileArray) {
                formData.append('files', file);
            }

            try {
                const { results } = await uploadResourceFiles(formData);
                const messages = results.map((r) =>
                    r.success ? `✅ ${r.fileName}` : `❌ ${r.fileName}: ${r.error}`
                );
                setUploadProgress(messages);

                // Auto-clear success messages after 3s
                setTimeout(() => {
                    setUploadProgress([]);
                    onUploaded();
                }, 3000);
            } catch (err) {
                setUploadProgress([`❌ Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`]);
            } finally {
                setUploading(false);
            }
        },
        [onUploaded]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            const files = e.dataTransfer.files;
            if (files.length > 0) handleFiles(files);
        },
        [handleFiles]
    );

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    }, []);

    return (
        <div>
            {/* Drop zone */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10 scale-[1.01]'
                    : uploading
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-gray-300 dark:border-neutral-600 bg-gray-50/50 dark:bg-neutral-800 hover:border-gray-400 hover:bg-gray-100/50 dark:hover:border-neutral-500 dark:hover:bg-neutral-700/50'
                    }`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) handleFiles(e.target.files);
                        e.target.value = ''; // Reset so same file can be re-uploaded
                    }}
                />

                {uploading ? (
                    <div className="space-y-2">
                        <div className="animate-spin text-2xl">⏳</div>
                        <p className="text-sm font-medium text-yellow-700">Uploading…</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="text-3xl">
                            {dragActive ? '📥' : '📂'}
                        </div>
                        <p className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                            {dragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
                        </p>
                        <p className="text-xs text-gray-400">
                            PDF, images, video, audio, documents, archives — up to 50 MB each
                        </p>
                    </div>
                )}
            </div>

            {/* Upload results */}
            {uploadProgress.length > 0 && (
                <div className="mt-3 space-y-1">
                    {uploadProgress.map((msg, i) => (
                        <p key={i} className="text-xs text-gray-600">{msg}</p>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Add text resource form ---

function AddTextForm({
    userId,
    onAdded,
}: {
    userId: string;
    onAdded: () => void;
}) {
    const [type, setType] = useState<'PROMPT' | 'LINK' | 'NOTE'>('PROMPT');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [readme, setReadme] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        startTransition(async () => {
            await addResource({
                type,
                title: title.trim(),
                content: content.trim(),
                createdById: userId,
                readme: readme.trim() || undefined,
                media: media.length > 0 ? JSON.parse(JSON.stringify(media)) : undefined,
            });
            setTitle('');
            setContent('');
            setReadme('');
            setMedia([]);
            onAdded();
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
                {(['PROMPT', 'LINK', 'NOTE'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${type === t
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 hover:bg-gray-200 dark:hover:bg-neutral-600'
                            }`}
                    >
                        {getTypeIcon(t)} {t.charAt(0) + t.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 outline-none"
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'LINK' ? 'https://…' : 'Content'}
                rows={type === 'PROMPT' ? 4 : 2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 outline-none resize-none"
            />
            <textarea
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                placeholder="README (optional) — short description for colleagues about what this prompt/link does"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 outline-none resize-none"
            />

            {/* Media attachments editor */}
            <MediaEditor media={media} onChange={setMedia} />

            <button
                type="submit"
                disabled={isPending || !title.trim() || !content.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:bg-gray-800 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
            >
                {isPending ? 'Adding…' : `Add ${type.charAt(0) + type.slice(1).toLowerCase()}`}
            </button>
        </form>
    );
}

// --- Resource card ---

function ResourceCard({
    resource,
    onRefresh,
}: {
    resource: Resource;
    onRefresh: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [expanded, setExpanded] = useState(false);
    const [editingReadme, setEditingReadme] = useState(false);
    const [readmeText, setReadmeText] = useState(resource.readme || '');
    const [editingMedia, setEditingMedia] = useState(false);
    const [editMedia, setEditMedia] = useState<MediaItem[]>((resource.media || []) as MediaItem[]);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

    const handleStar = () => {
        startTransition(async () => {
            await updateResource(resource.id, { starred: !resource.starred });
            onRefresh();
        });
    };

    const handleDelete = () => {
        if (!confirm('Delete this resource?')) return;
        startTransition(async () => {
            await deleteResource(resource.id);
            onRefresh();
        });
    };

    const handleCopy = () => {
        const textToCopy = resource.type === 'FILE' && resource.fileUrl
            ? resource.fileUrl
            : resource.content;
        navigator.clipboard.writeText(textToCopy);
        startTransition(async () => {
            await updateResource(resource.id, { useCount: resource.useCount + 1 });
            onRefresh();
        });
    };

    const handleSaveReadme = () => {
        const trimmed = readmeText.trim();
        startTransition(async () => {
            await updateResource(resource.id, { readme: trimmed || null });
            setEditingReadme(false);
            onRefresh();
        });
    };

    const handleSaveMedia = () => {
        startTransition(async () => {
            await updateResource(resource.id, { media: JSON.parse(JSON.stringify(editMedia)) });
            setEditingMedia(false);
            onRefresh();
        });
    };

    const isFile = resource.type === 'FILE';
    const icon = isFile ? getFileIcon(resource.mimeType) : getTypeIcon(resource.type);
    const isImage = resource.mimeType?.startsWith('image/');

    const mediaArray = (resource.media || []) as MediaItem[];
    const imageCount = mediaArray.filter((m) => m.type === 'image').length;
    const videoCount = mediaArray.filter((m) => m.type === 'video').length;

    return (
        <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={handleStar}
                        disabled={isPending}
                        className="text-lg hover:scale-110 transition-transform shrink-0"
                        title={resource.starred ? 'Unstar' : 'Star'}
                    >
                        {resource.starred ? '⭐' : '☆'}
                    </button>
                    <span className="text-base shrink-0">{icon}</span>
                    <h3
                        className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate cursor-pointer hover:text-primary"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {resource.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {/* Media count badges */}
                    {imageCount > 0 && (
                        <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-gray-400 dark:text-neutral-500"
                            title={`${imageCount} image${imageCount > 1 ? 's' : ''}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                            </svg>
                            <span className="text-[10px] font-medium">{imageCount}</span>
                        </span>
                    )}
                    {videoCount > 0 && (
                        <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-gray-400 dark:text-neutral-500"
                            title={`${videoCount} video${videoCount > 1 ? 's' : ''}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                            <span className="text-[10px] font-medium">{videoCount}</span>
                        </span>
                    )}

                    {isFile && resource.fileUrl && (
                        <a
                            href={resource.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Open file"
                        >
                            ↗️
                        </a>
                    )}
                    {resource.readme && (
                        <span
                            className="p-1 text-blue-400 dark:text-blue-500 cursor-pointer hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                            title={resource.readme}
                            onClick={() => setExpanded(!expanded)}
                        >
                            📖
                        </span>
                    )}
                    <button
                        onClick={handleCopy}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={isFile ? 'Copy URL' : 'Copy to clipboard'}
                    >
                        📋
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 font-medium">
                    {resource.type}
                </span>
                {resource.createdBy.name && <span>by {resource.createdBy.name}</span>}
                {isFile && resource.fileSize && (
                    <span>{formatFileSize(resource.fileSize)}</span>
                )}
                {isFile && resource.mimeType && (
                    <span className="text-gray-300">•</span>
                )}
                {isFile && resource.mimeType && (
                    <span>{resource.content}</span>
                )}
                <span className="text-gray-300">•</span>
                <span>used {resource.useCount}x</span>
            </div>

            {/* Expanded content */}
            {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700 space-y-3">
                    {/* README section */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">📖 README</span>
                            <button
                                onClick={() => {
                                    if (editingReadme) {
                                        handleSaveReadme();
                                    } else {
                                        setEditingReadme(true);
                                    }
                                }}
                                disabled={isPending}
                                className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                                {editingReadme ? (isPending ? 'Saving…' : '💾 Save') : '✏️ Edit'}
                            </button>
                        </div>
                        {editingReadme ? (
                            <textarea
                                value={readmeText}
                                onChange={(e) => setReadmeText(e.target.value)}
                                rows={3}
                                placeholder="Short description for colleagues about what this prompt/link does…"
                                className="w-full px-2 py-1.5 text-xs border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
                                autoFocus
                            />
                        ) : (
                            <p className="text-xs text-gray-600 dark:text-neutral-400 leading-relaxed whitespace-pre-wrap">
                                {resource.readme || <span className="italic text-gray-400 dark:text-neutral-500">No README yet — click &quot;Edit&quot; to add a description</span>}
                            </p>
                        )}
                    </div>

                    {/* Content */}
                    {isFile && isImage && resource.fileUrl ? (
                        // Image preview
                        <div className="rounded-lg overflow-hidden border border-gray-200 max-h-64">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={resource.fileUrl}
                                alt={resource.title}
                                className="w-full h-auto max-h-64 object-contain bg-gray-50"
                            />
                        </div>
                    ) : isFile && resource.mimeType?.startsWith('video/') && resource.fileUrl ? (
                        // Video preview
                        <video
                            src={resource.fileUrl}
                            controls
                            className="w-full max-h-64 rounded-lg"
                        />
                    ) : isFile && resource.mimeType?.startsWith('audio/') && resource.fileUrl ? (
                        // Audio preview
                        <audio src={resource.fileUrl} controls className="w-full" />
                    ) : isFile && resource.fileUrl ? (
                        // Generic file — download link
                        <a
                            href={resource.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                        >
                            {icon} Open {resource.fileName || resource.title}
                        </a>
                    ) : resource.type === 'LINK' ? (
                        <a
                            href={resource.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline break-all"
                        >
                            {resource.content}
                        </a>
                    ) : (
                        <pre className="text-xs text-gray-700 dark:text-neutral-300 bg-gray-50 dark:bg-neutral-700 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {resource.content}
                        </pre>
                    )}

                    {/* Media attachments display */}
                    {mediaArray.length > 0 && !editingMedia && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">📎 Media</span>
                                <button
                                    onClick={() => { setEditMedia([...mediaArray]); setEditingMedia(true); }}
                                    className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
                                >
                                    ✏️ Edit Media
                                </button>
                            </div>

                            {/* Image gallery */}
                            {mediaArray.filter((m) => m.type === 'image').length > 0 && (
                                <div className="grid grid-cols-3 gap-2">
                                    {mediaArray.filter((m) => m.type === 'image').map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => {
                                                if (img.linkUrl) {
                                                    window.open(img.linkUrl, '_blank', 'noopener,noreferrer');
                                                } else {
                                                    setLightboxSrc(img.url);
                                                }
                                            }}
                                            className="relative group cursor-pointer"
                                            title={img.linkUrl ? `Opens: ${img.linkUrl}` : 'Click to view full size'}
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={img.url}
                                                alt={img.filename || 'Attached image'}
                                                className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-neutral-600 group-hover:opacity-90 transition-opacity"
                                            />
                                            {img.linkUrl && (
                                                <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-0.5">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                                    </svg>
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Video embeds */}
                            {mediaArray.filter((m) => m.type === 'video').map((vid, idx) => (
                                vid.service && vid.videoId ? (
                                    <div key={idx} className="rounded-lg overflow-hidden">
                                        <VideoEmbedPlayer embed={{ service: vid.service as 'youtube' | 'vimeo' | 'loom', id: vid.videoId, url: vid.url }} />
                                    </div>
                                ) : null
                            ))}
                        </div>
                    )}

                    {/* Media editing */}
                    {editingMedia && (
                        <div className="space-y-2">
                            <MediaEditor media={editMedia} onChange={setEditMedia} />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveMedia}
                                    disabled={isPending}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-900 dark:bg-neutral-200 text-white dark:text-neutral-900 hover:bg-gray-800 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
                                >
                                    {isPending ? 'Saving…' : '💾 Save Media'}
                                </button>
                                <button
                                    onClick={() => setEditingMedia(false)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add media if none exist yet */}
                    {mediaArray.length === 0 && !editingMedia && (
                        <button
                            onClick={() => { setEditMedia([]); setEditingMedia(true); }}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
                        >
                            + Add media attachments
                        </button>
                    )}
                </div>
            )}

            {/* Lightbox */}
            {lightboxSrc && (
                <ImageLightbox
                    src={lightboxSrc}
                    alt={resource.title}
                    onClose={() => setLightboxSrc(null)}
                />
            )}
        </div>
    );
}

// --- Main library component ---

export function ResourceLibrary({ initialResources, userId }: ResourceLibraryProps) {
    const [resources, setResources] = useState(initialResources);
    const [activeTab, setActiveTab] = useState<'ALL' | 'PROMPT' | 'LINK' | 'NOTE' | 'FILE'>('ALL');
    const [search, setSearch] = useState('');
    const [showTextForm, setShowTextForm] = useState(false);

    const filteredResources = resources.filter((r) => {
        if (activeTab !== 'ALL' && r.type !== activeTab) return false;
        if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const handleRefresh = () => {
        window.location.reload();
    };

    // Counts per type
    const counts = {
        ALL: resources.length,
        FILE: resources.filter((r) => r.type === 'FILE').length,
        PROMPT: resources.filter((r) => r.type === 'PROMPT').length,
        LINK: resources.filter((r) => r.type === 'LINK').length,
        NOTE: resources.filter((r) => r.type === 'NOTE').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Shared Resources</h2>
                <button
                    onClick={() => setShowTextForm(!showTextForm)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                >
                    {showTextForm ? 'Cancel' : '✏️ Add Text'}
                </button>
            </div>

            {/* Drop zone — always visible at top */}
            <DropZone userId={userId} onUploaded={handleRefresh} />

            {/* Manual text form */}
            {showTextForm && <AddTextForm userId={userId} onAdded={handleRefresh} />}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-neutral-700 overflow-x-auto">
                {TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === id
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                            }`}
                    >
                        {label}
                        <span className="ml-1 text-gray-400">({counts[id]})</span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources…"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:ring-2 focus:ring-gray-400 dark:focus:ring-neutral-500 focus:border-gray-400 outline-none"
            />

            {/* Resource list */}
            <div className="space-y-2">
                {filteredResources.length === 0 ? (
                    <p className="text-center text-gray-400 py-8 text-sm">
                        {search ? 'No matching resources' : 'No resources yet — drag files above or add text'}
                    </p>
                ) : (
                    filteredResources.map((resource) => (
                        <ResourceCard key={resource.id} resource={resource} onRefresh={handleRefresh} />
                    ))
                )}
            </div>
        </div>
    );
}
