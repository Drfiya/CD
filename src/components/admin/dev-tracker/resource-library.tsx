'use client';

/**
 * Dev Tracker Resource Library — Client component.
 * Shared prompts, links, and notes with search, CRUD, and starring.
 */

import { useState, useTransition } from 'react';
import {
    addResource,
    updateResource,
    deleteResource,
} from '@/lib/dev-tracker/actions';

// --- Types ---

interface Resource {
    id: string;
    type: 'PROMPT' | 'LINK' | 'NOTE';
    title: string;
    content: string;
    starred: boolean;
    useCount: number;
    createdAt: Date;
    createdBy: { name: string | null };
}

interface ResourceLibraryProps {
    initialResources: Resource[];
    userId: string;
}

// --- Tab config ---

const TABS = [
    { id: 'PROMPT' as const, label: '📋 Prompts' },
    { id: 'LINK' as const, label: '🔗 Links' },
    { id: 'NOTE' as const, label: '📝 Notes' },
];

// --- Add resource form ---

function AddResourceForm({
    activeTab,
    userId,
    onAdded,
}: {
    activeTab: 'PROMPT' | 'LINK' | 'NOTE';
    userId: string;
    onAdded: () => void;
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        startTransition(async () => {
            await addResource({
                type: activeTab,
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
                placeholder={activeTab === 'LINK' ? 'URL' : 'Content'}
                rows={activeTab === 'PROMPT' ? 4 : 2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
            />
            <button
                type="submit"
                disabled={isPending || !title.trim() || !content.trim()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                {isPending ? 'Adding…' : 'Add Resource'}
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
    const [showContent, setShowContent] = useState(false);

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
        navigator.clipboard.writeText(resource.content);
        startTransition(async () => {
            await updateResource(resource.id, { useCount: resource.useCount + 1 });
            onRefresh();
        });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        onClick={handleStar}
                        disabled={isPending}
                        className="text-lg hover:scale-110 transition-transform"
                        title={resource.starred ? 'Unstar' : 'Star'}
                    >
                        {resource.starred ? '⭐' : '☆'}
                    </button>
                    <h3
                        className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-indigo-600"
                        onClick={() => setShowContent(!showContent)}
                    >
                        {resource.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={handleCopy}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy to clipboard"
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
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                {resource.createdBy.name && <span>by {resource.createdBy.name}</span>}
                <span>•</span>
                <span>used {resource.useCount}x</span>
            </div>

            {/* Expandable content */}
            {showContent && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    {resource.type === 'LINK' ? (
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
    const [activeTab, setActiveTab] = useState<'PROMPT' | 'LINK' | 'NOTE'>('PROMPT');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);

    const filteredResources = resources.filter((r) => {
        if (r.type !== activeTab) return false;
        if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    // Refresh by reloading the page (server action revalidates)
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-semibold text-gray-900">Shared Resources</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                    {showForm ? 'Cancel' : '+ Add Resource'}
                </button>
            </div>

            {/* Add form */}
            {showForm && (
                <AddResourceForm activeTab={activeTab} userId={userId} onAdded={handleRefresh} />
            )}

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {TABS.map(({ id, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {label}
                        <span className="ml-1 text-xs text-gray-400">
                            ({resources.filter((r) => r.type === id).length})
                        </span>
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
                        No {activeTab.toLowerCase()}s yet
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
