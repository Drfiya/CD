'use client';

import { useState } from 'react';

interface FeatureIdeaFormProps {
    idea?: { title: string; description: string; priority: string | null; tags: string[] } | null;
    onSubmit: (data: { title: string; description: string; priority?: string; tags?: string[] }) => Promise<void>;
    onCancel: () => void;
    isPending: boolean;
}

export function FeatureIdeaForm({ idea, onSubmit, onCancel, isPending }: FeatureIdeaFormProps) {
    const [title, setTitle] = useState(idea?.title ?? '');
    const [description, setDescription] = useState(idea?.description ?? '');
    const [priority, setPriority] = useState(idea?.priority ?? '');
    const [tagsInput, setTagsInput] = useState(idea?.tags?.join(', ') ?? '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;
        const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
        await onSubmit({
            title: title.trim(),
            description: description.trim(),
            priority: priority || undefined,
            tags: tags.length > 0 ? tags : undefined,
        });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5 space-y-4"
        >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                {idea ? 'Edit Idea' : 'New Feature Idea'}
            </h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                    Title <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="Short, descriptive title"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                    Description <span className="text-red-500">*</span>
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    placeholder="What does this feature do? Why is it important? What problem does it solve?"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                        Priority <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
                    </label>
                    <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                        <option value="">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                        Tags <span className="text-gray-400 dark:text-neutral-500">(comma-separated)</span>
                    </label>
                    <input
                        type="text"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="UI, Backend, AI Tools"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={isPending || !title.trim() || !description.trim()}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: '#D94A4A' }}
                >
                    {isPending ? 'Saving...' : idea ? 'Save Changes' : 'Submit Idea'}
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
