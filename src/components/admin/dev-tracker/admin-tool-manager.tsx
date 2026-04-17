'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAdminTool, deleteAdminTool } from '@/lib/admin-tool-actions';

interface AdminTool {
    id: string;
    name: string;
    url: string;
    description: string | null;
    createdAt: Date;
}

interface AdminToolManagerProps {
    tools: AdminTool[];
}

export function AdminToolManager({ tools }: AdminToolManagerProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !url.trim()) return;

        startTransition(async () => {
            await createAdminTool({
                name: name.trim(),
                url: url.trim(),
                description: description.trim() || undefined,
            });
            setName('');
            setUrl('');
            setDescription('');
            router.refresh();
        });
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            await deleteAdminTool(id);
            setDeleteConfirm(null);
            router.refresh();
        });
    };

    const truncateUrl = (u: string, max = 50) => {
        const clean = u.replace(/^https?:\/\//, '');
        return clean.length > max ? clean.slice(0, max) + '…' : clean;
    };

    return (
        <div className="space-y-6">
            {/* Add new tool form */}
            <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 p-5 space-y-4"
            >
                <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
                    Add New Tool
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                            Tool Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder='z.B. "🎬 Video Ad Master"'
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                            Link URL <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/tool?token=..."
                            required
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                        Description <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder='z.B. "KI-generierte Video-Ad-Scripts"'
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isPending || !name.trim() || !url.trim()}
                        className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#D94A4A' }}
                    >
                        {isPending ? 'Adding…' : 'Add Tool'}
                    </button>
                </div>
            </form>

            {/* Tools table */}
            {tools.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600 mb-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                    </svg>
                    <p className="text-gray-500 dark:text-neutral-400 font-medium">No admin tools configured yet</p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Use the form above to add your first tool.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-neutral-700 text-left">
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">Name</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 hidden md:table-cell">Description</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">URL</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 hidden sm:table-cell">Created</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-28 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tools.map((tool) => (
                                <tr
                                    key={tool.id}
                                    className="border-b border-gray-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-gray-900 dark:text-neutral-100 notranslate">
                                            {tool.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <span className="text-gray-500 dark:text-neutral-400 line-clamp-1">
                                            {tool.description || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <a
                                            href={tool.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[200px] block"
                                        >
                                            {truncateUrl(tool.url)}
                                        </a>
                                    </td>
                                    <td className="px-4 py-3 hidden sm:table-cell">
                                        <span className="text-gray-400 dark:text-neutral-500 text-xs">
                                            {new Date(tool.createdAt).toLocaleDateString('de-DE', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                            })}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {deleteConfirm === tool.id ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDelete(tool.id)}
                                                    disabled={isPending}
                                                    className="text-red-600 dark:text-red-300 text-sm font-medium"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="text-gray-400 text-sm"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(tool.id)}
                                                className="text-red-500 hover:text-red-600 dark:text-red-300 dark:hover:text-red-300 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
