'use client';

/**
 * Dev Tracker Resource Library — Client component.
 * Drag-and-drop file uploads + manual text entries (prompts, links, notes).
 */

import { useState, useTransition, useCallback, useRef } from 'react';
import {
    addResource,
    updateResource,
    deleteResource,
} from '@/lib/dev-tracker/actions';
import { uploadResourceFiles } from '@/lib/dev-tracker/upload-actions';

// --- Types ---

interface Resource {
    id: string;
    type: 'PROMPT' | 'LINK' | 'NOTE' | 'FILE';
    title: string;
    content: string;
    starred: boolean;
    useCount: number;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
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
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                    : uploading
                        ? 'border-yellow-400 bg-yellow-50'
                        : 'border-gray-300 bg-gray-50/50 hover:border-indigo-400 hover:bg-indigo-50/30'
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
                        <p className="text-sm font-medium text-gray-700">
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
            });
            setTitle('');
            setContent('');
            onAdded();
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex gap-2">
                {(['PROMPT', 'LINK', 'NOTE'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${type === t
                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={type === 'LINK' ? 'https://…' : 'Content'}
                rows={type === 'PROMPT' ? 4 : 2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
            <button
                type="submit"
                disabled={isPending || !title.trim() || !content.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
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
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleStar = () => {
        startTransition(async () => {
            await updateResource(resource.id, { starred: !resource.starred });
            onRefresh();
        });
    };

    const handleDelete = () => {
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

    const isFile = resource.type === 'FILE';
    const icon = isFile ? getFileIcon(resource.mimeType) : getTypeIcon(resource.type);
    const isImage = resource.mimeType?.startsWith('image/');

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
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
                        className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                        onClick={() => setExpanded(!expanded)}
                    >
                        {resource.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
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
                    <button
                        onClick={handleCopy}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title={isFile ? 'Copy URL' : 'Copy to clipboard'}
                    >
                        📋
                    </button>
                    {confirmDelete ? (
                        <>
                            <button
                                onClick={handleDelete}
                                disabled={isPending}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                            >
                                {isPending ? '…' : 'Confirm?'}
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                        >
                            🗑️
                        </button>
                    )}
                </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">
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
                <div className="mt-3 pt-3 border-t border-gray-100">
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
                        <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {resource.content}
                        </pre>
                    )}
                </div>
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
                <h2 className="text-lg font-semibold text-gray-900">Shared Resources</h2>
                <button
                    onClick={() => setShowTextForm(!showTextForm)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    {showTextForm ? 'Cancel' : '✏️ Add Text'}
                </button>
            </div>

            {/* Drop zone — always visible at top */}
            <DropZone userId={userId} onUploaded={handleRefresh} />

            {/* Manual text form */}
            {showTextForm && <AddTextForm userId={userId} onAdded={handleRefresh} />}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
                {TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === id
                            ? 'border-indigo-500 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
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
