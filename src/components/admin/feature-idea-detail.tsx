'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    toggleUpvote,
    updateFeatureIdeaStatus,
    updateFeatureIdea,
    deleteFeatureIdea,
    addIdeaComment,
} from '@/lib/feature-idea-actions';
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

interface IdeaDetail {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string | null;
    tags: string[];
    author: { id: string; name: string | null; image: string | null; role: string };
    comments: {
        id: string;
        content: string;
        createdAt: Date;
        author: { id: string; name: string | null; image: string | null };
    }[];
    upvoteCount: number;
    hasUpvoted: boolean;
    currentUserId: string;
    currentUserRole: string;
    createdAt: Date;
}

interface FeatureIdeaDetailProps {
    idea: IdeaDetail;
}

export function FeatureIdeaDetail({ idea }: FeatureIdeaDetailProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [commentText, setCommentText] = useState('');
    const [editing, setEditing] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const canEdit = idea.author.id === idea.currentUserId || idea.currentUserRole === 'owner';
    const statusCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.NEW;

    const handleUpvote = () => {
        startTransition(async () => {
            await toggleUpvote(idea.id);
            router.refresh();
        });
    };

    const handleStatusChange = (status: string) => {
        startTransition(async () => {
            await updateFeatureIdeaStatus(idea.id, status as any);
            router.refresh();
        });
    };

    const handleEdit = async (data: { title: string; description: string; priority?: string; tags?: string[] }) => {
        startTransition(async () => {
            await updateFeatureIdea(idea.id, {
                title: data.title,
                description: data.description,
                priority: data.priority || null,
                tags: data.tags || [],
            });
            setEditing(false);
            router.refresh();
        });
    };

    const handleDelete = () => {
        startTransition(async () => {
            await deleteFeatureIdea(idea.id);
            router.push('/admin/feature-ideas');
        });
    };

    const handleComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        startTransition(async () => {
            await addIdeaComment(idea.id, commentText.trim());
            setCommentText('');
            router.refresh();
        });
    };

    if (editing) {
        return (
            <div className="space-y-4">
                <Link
                    href="/admin/feature-ideas"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                    </svg>
                    Back to Ideas
                </Link>
                <FeatureIdeaForm
                    idea={idea}
                    onSubmit={handleEdit}
                    onCancel={() => setEditing(false)}
                    isPending={isPending}
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back link */}
            <Link
                href="/admin/feature-ideas"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back to Ideas
            </Link>

            {/* Main content */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-6">
                {/* Header */}
                <div className="flex items-start gap-4 mb-4">
                    {/* Upvote */}
                    <div className="flex flex-col items-center shrink-0">
                        <button
                            onClick={handleUpvote}
                            disabled={isPending}
                            className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-colors ${idea.hasUpvoted
                                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-500'
                                : 'border-gray-200 dark:border-neutral-600 hover:border-gray-300 dark:hover:border-neutral-500 text-gray-400 dark:text-neutral-500'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <span className={`text-sm font-bold mt-1 ${idea.hasUpvoted ? 'text-red-500' : 'text-gray-500 dark:text-neutral-400'}`}>
                            {idea.upvoteCount}
                        </span>
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h1 className="text-xl font-bold text-gray-900 dark:text-neutral-100">{idea.title}</h1>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                            {idea.priority && (
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${idea.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                    idea.priority === 'medium' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                                        'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400'
                                    }`}>
                                    {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)} Priority
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-neutral-400 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Avatar src={idea.author.image} name={idea.author.name} size="sm" />
                                <span>{idea.author.name}</span>
                            </div>
                            <span>•</span>
                            <span>{new Date(idea.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>

                        {idea.tags.length > 0 && (
                            <div className="flex gap-1.5 mb-4">
                                {idea.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-neutral-700 rounded-full text-gray-500 dark:text-neutral-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Description */}
                <div className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed mb-6 pl-16">
                    {idea.description}
                </div>

                {/* Actions bar */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-neutral-700 pt-4 pl-16">
                    {/* Status dropdown */}
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-neutral-400">Status:</label>
                        <select
                            value={idea.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            disabled={isPending}
                            className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Edit / Delete */}
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setEditing(true)}
                                className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                                Edit
                            </button>
                            {deleteConfirm ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isPending}
                                        className="text-sm text-red-600 dark:text-red-400 font-medium"
                                    >
                                        Confirm Delete
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirm(false)}
                                        className="text-sm text-gray-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeleteConfirm(true)}
                                    className="text-sm text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Comments section */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                    Comments ({idea.comments.length})
                </h2>

                {/* Comment list */}
                {idea.comments.length > 0 && (
                    <div className="space-y-4 mb-6">
                        {idea.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                                <Avatar src={comment.author.image} name={comment.author.name} size="sm" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                                            {comment.author.name}
                                        </span>
                                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                                            {new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-neutral-300 whitespace-pre-wrap">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add comment */}
                <form onSubmit={handleComment} className="flex gap-3">
                    <div className="flex-1">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isPending || !commentText.trim()}
                        className="self-end px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 shrink-0"
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        {isPending ? '...' : 'Post'}
                    </button>
                </form>
            </div>
        </div>
    );
}
