'use client';

import { useState } from 'react';

interface AiTool {
    id: string;
    name: string;
    url: string;
    description: string | null;
    active: boolean;
    openInNewTab: boolean;
    position: number;
}

interface AiToolFormProps {
    tool: AiTool | null;
    onSubmit: (data: {
        name: string;
        url: string;
        description?: string;
        active: boolean;
        openInNewTab: boolean;
    }) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}

export function AiToolForm({ tool, onSubmit, onCancel, isPending }: AiToolFormProps) {
    const [name, setName] = useState(tool?.name ?? '');
    const [url, setUrl] = useState(tool?.url ?? '');
    const [description, setDescription] = useState(tool?.description ?? '');
    const [active, setActive] = useState(tool?.active ?? true);
    const [openInNewTab, setOpenInNewTab] = useState(tool?.openInNewTab ?? true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;
        await onSubmit({
            name: name.trim(),
            url: url.trim(),
            description: description.trim() || undefined,
            active,
            openInNewTab,
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5 space-y-4"
        >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                {tool ? 'Edit Tool' : 'Add New Tool'}
            </h3>

            {/* Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                    Tool Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. GLP Study Protocol Generator"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
            </div>

            {/* URL */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                    Tool URL <span className="text-red-500">*</span>
                </label>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://tool.scienceexperts.ai"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                    Description <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Short description for the AI Tools overview page"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                />
            </div>

            {/* Toggles row */}
            <div className="flex items-center gap-6">
                {/* Active toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={active}
                        onClick={() => setActive(!active)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-300 dark:bg-neutral-600'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-neutral-300">Active</span>
                </label>

                {/* Open in new tab */}
                <label className="flex items-center gap-2 cursor-pointer">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={openInNewTab}
                        onClick={() => setOpenInNewTab(!openInNewTab)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${openInNewTab ? 'bg-blue-500' : 'bg-gray-300 dark:bg-neutral-600'
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${openInNewTab ? 'translate-x-4' : 'translate-x-0'
                                }`}
                        />
                    </button>
                    <span className="text-sm text-gray-700 dark:text-neutral-300">Open in new tab</span>
                </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending || !name.trim() || !url.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#D94A4A' }}
                >
                    {isPending ? 'Saving...' : tool ? 'Save Changes' : 'Create Tool'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
