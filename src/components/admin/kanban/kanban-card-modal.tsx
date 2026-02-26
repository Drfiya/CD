'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadPostMedia } from '@/lib/media-actions';

interface KanbanCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { title: string; description?: string; imageUrl?: string }) => void;
    initialData?: {
        title: string;
        description?: string | null;
        imageUrl?: string | null;
    };
    mode: 'create' | 'edit';
}

export function KanbanCardModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    mode,
}: KanbanCardModalProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const backdropRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = useCallback(async (file: File) => {
        console.log('[KanbanUpload] Starting upload:', file.name, file.type, file.size);
        if (!file.type.startsWith('image/')) {
            console.error('[KanbanUpload] Not an image:', file.type);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Image must be 5 MB or smaller.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('[KanbanUpload] Calling uploadPostMedia...');
            const result = await uploadPostMedia(formData);
            console.log('[KanbanUpload] Result:', JSON.stringify(result));

            if ('success' in result && result.success) {
                setImageUrl(result.media.url);
                console.log('[KanbanUpload] Success! URL:', result.media.url);
            } else if ('error' in result) {
                console.error('[KanbanUpload] Error:', result.error);
                alert('Upload failed: ' + result.error);
            }
        } catch (err) {
            console.error('[KanbanUpload] Exception:', err);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOver(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    }, [handleUpload]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSaving(true);
        await onSave({
            title: title.trim(),
            description: description.trim() || undefined,
            imageUrl: imageUrl.trim() || undefined,
        });
        setSaving(false);
    };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => e.target === backdropRef.current && onClose()}
        >
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-neutral-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                        {mode === 'create' ? 'Create New Card' : 'Edit Card'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter project name..."
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            autoFocus
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Details, notes, information..."
                            rows={4}
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all resize-none"
                        />
                    </div>

                    {/* Image Upload — Drag & Drop */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1.5">Image (optional)</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {imageUrl ? (
                            /* Preview */
                            <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-700">
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="w-full h-40 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setImageUrl('')}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 rounded-lg bg-white/90 text-sm font-medium text-red-600 hover:bg-white shadow-sm"
                                    >
                                        Remove image
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Drop Zone */
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    flex flex-col items-center justify-center gap-2 py-8 px-4
                                    rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                                    ${dragOver
                                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20 scale-[1.01]'
                                        : 'border-gray-200 dark:border-neutral-600 bg-gray-50/50 dark:bg-neutral-700/50 hover:border-gray-300 dark:hover:border-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-700'
                                    }
                                    ${uploading ? 'pointer-events-none opacity-60' : ''}
                                `}
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                        <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dragOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <span className="text-sm text-gray-500 dark:text-neutral-400">
                                                Drag image here or <span className="text-blue-600 font-medium">browse</span>
                                            </span>
                                            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, GIF, WebP — max 5 MB</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || saving || uploading}
                            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
