'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toggleUpvote, createFeatureIdea } from '@/lib/feature-idea-actions';
import { FeatureIdeaForm } from '@/components/admin/feature-idea-form';
import { Avatar } from '@/components/ui/avatar';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    NEW: { label: 'New', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    UNDER_REVIEW: { label: 'Under Review', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    APPROVED: { label: 'Approved', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
    IN_PROGRESS: { label: 'In Progress', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    COMPLETED: { label: 'Completed', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    DECLINED: { label: 'Declined', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

const STATUSES = Object.keys(STATUS_CONFIG);

interface Idea {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    tags: string[];
    author: { id: string; name: string | null; image: string | null };
    upvoteCount: number;
    commentCount: number;
    hasUpvoted: boolean;
    createdAt: Date;
}

interface FeatureIdeasListProps {
    ideas: Idea[];
    currentFilter?: string;
    currentSort: string;
}

export function FeatureIdeasList({ ideas, currentFilter, currentSort }: FeatureIdeasListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);

    const updateFilter = (status?: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (status) {
            params.set('status', status);
        } else {
            params.delete('status');
        }
        router.push(`/admin/feature-ideas?${params.toString()}`);
    };

    const updateSort = (sort: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('sort', sort);
        router.push(`/admin/feature-ideas?${params.toString()}`);
    };

    const handleUpvote = (ideaId: string) => {
        startTransition(async () => {
            await toggleUpvote(ideaId);
            router.refresh();
        });
    };

    const handleCreate = async (data: { title: string; description: string; priority?: string; tags?: string[] }) => {
        startTransition(async () => {
            await createFeatureIdea(data);
            setShowForm(false);
            router.refresh();
        });
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status filter */}
                    <button
                        onClick={() => updateFilter()}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${!currentFilter
                                ? 'bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                            }`}
                    >
                        All
                    </button>
                    {STATUSES.map((s) => (
                        <button
                            key={s}
                            onClick={() => updateFilter(s)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${currentFilter === s
                                    ? 'bg-gray-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
                                    : 'bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                                }`}
                        >
                            {STATUS_CONFIG[s].label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    {/* Sort */}
                    <select
                        value={currentSort}
                        onChange={(e) => updateSort(e.target.value)}
                        className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 outline-none"
                    >
                        <option value="upvotes">Most Upvoted</option>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        + Add New Idea
                    </button>
                </div>
            </div>

            {/* Create form */}
            {showForm && (
                <FeatureIdeaForm
                    onSubmit={handleCreate}
                    onCancel={() => setShowForm(false)}
                    isPending={isPending}
                />
            )}

            {/* Ideas list */}
            {ideas.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600 mb-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                    <p className="text-gray-500 dark:text-neutral-400 font-medium">No ideas yet</p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Click &quot;+ Add New Idea&quot; to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {ideas.map((idea) => {
                        const statusCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.NEW;
                        return (
                            <div
                                key={idea.id}
                                className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5 hover:border-gray-200 dark:hover:border-neutral-600 transition-colors"
                            >
                                <div className="flex gap-4">
                                    {/* Upvote button */}
                                    <div className="flex flex-col items-center shrink-0">
                                        <button
                                            onClick={() => handleUpvote(idea.id)}
                                            disabled={isPending}
                                            className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${idea.hasUpvoted
                                                    ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-500'
                                                    : 'border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500 text-gray-400 dark:text-neutral-500'
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                        <span className={`text-sm font-semibold mt-1 ${idea.hasUpvoted ? 'text-red-500' : 'text-gray-500 dark:text-neutral-400'}`}>
                                            {idea.upvoteCount}
                                        </span>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <Link
                                                href={`/admin/feature-ideas/${idea.id}`}
                                                className="text-base font-semibold text-gray-900 dark:text-neutral-100 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            >
                                                {idea.title}
                                            </Link>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                                                {statusCfg.label}
                                            </span>
                                            {idea.priority && (
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${idea.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                                        idea.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                                            'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'
                                                    }`}>
                                                    {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm text-gray-600 dark:text-neutral-400 line-clamp-2 mb-2">
                                            {idea.description}
                                        </p>

                                        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-neutral-500">
                                            <div className="flex items-center gap-1.5">
                                                <Avatar src={idea.author.image} name={idea.author.name} size="xs" />
                                                <span>{idea.author.name}</span>
                                            </div>
                                            <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                                                </svg>
                                                <span>{idea.commentCount}</span>
                                            </div>
                                            {idea.tags.length > 0 && (
                                                <div className="flex gap-1">
                                                    {idea.tags.slice(0, 3).map((tag) => (
                                                        <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-neutral-700 rounded text-gray-500 dark:text-neutral-400">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
