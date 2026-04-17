'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAiTool, updateAiTool, deleteAiTool, reorderAiTools } from '@/lib/ai-tool-actions';
import { AiToolForm } from '@/components/admin/ai-tool-form';

interface AiTool {
    id: string;
    name: string;
    url: string;
    description: string | null;
    active: boolean;
    openInNewTab: boolean;
    position: number;
}

interface AiToolTableProps {
    tools: AiTool[];
}

export function AiToolTable({ tools }: AiToolTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showForm, setShowForm] = useState(false);
    const [editingTool, setEditingTool] = useState<AiTool | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const handleCreate = async (data: {
        name: string;
        url: string;
        description?: string;
        active: boolean;
        openInNewTab: boolean;
    }) => {
        startTransition(async () => {
            await createAiTool(data);
            setShowForm(false);
            router.refresh();
        });
    };

    const handleUpdate = async (data: {
        name: string;
        url: string;
        description?: string;
        active: boolean;
        openInNewTab: boolean;
    }) => {
        if (!editingTool) return;
        startTransition(async () => {
            await updateAiTool(editingTool.id, {
                ...data,
                description: data.description || null,
            });
            setEditingTool(null);
            router.refresh();
        });
    };

    const handleDelete = async (id: string) => {
        startTransition(async () => {
            await deleteAiTool(id);
            setDeleteConfirm(null);
            router.refresh();
        });
    };

    const handleToggleActive = async (tool: AiTool) => {
        startTransition(async () => {
            await updateAiTool(tool.id, { active: !tool.active });
            router.refresh();
        });
    };

    const handleMoveUp = async (index: number) => {
        if (index === 0) return;
        const ids = tools.map((t) => t.id);
        [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
        startTransition(async () => {
            await reorderAiTools(ids);
            router.refresh();
        });
    };

    const handleMoveDown = async (index: number) => {
        if (index === tools.length - 1) return;
        const ids = tools.map((t) => t.id);
        [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
        startTransition(async () => {
            await reorderAiTools(ids);
            router.refresh();
        });
    };

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {tools.length} tool{tools.length !== 1 ? 's' : ''} configured
                </p>
                <button
                    onClick={() => { setShowForm(true); setEditingTool(null); }}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#D94A4A' }}
                >
                    + Add New Tool
                </button>
            </div>

            {/* Create / Edit Form */}
            {(showForm || editingTool) && (
                <AiToolForm
                    tool={editingTool}
                    onSubmit={editingTool ? handleUpdate : handleCreate}
                    onCancel={() => { setShowForm(false); setEditingTool(null); }}
                    isPending={isPending}
                />
            )}

            {/* Table */}
            {tools.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-gray-300 dark:text-neutral-600 mb-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                    <p className="text-gray-500 dark:text-neutral-400 font-medium">No AI tools configured yet</p>
                    <p className="text-sm text-gray-400 dark:text-neutral-500 mt-1">Click &quot;Add New Tool&quot; to get started.</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-100 dark:border-neutral-700 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-neutral-700 text-left">
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-12">#</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400">Tool Name</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 hidden md:table-cell">URL</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-24 text-center">Status</th>
                                <th className="px-4 py-3 font-medium text-gray-500 dark:text-neutral-400 w-44 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tools.map((tool, index) => (
                                <tr
                                    key={tool.id}
                                    className="border-b border-gray-50 dark:border-neutral-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-neutral-700/30 transition-colors"
                                >
                                    {/* Position with reorder */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-400 dark:text-neutral-500 font-mono text-xs w-4 text-center">
                                                {index + 1}
                                            </span>
                                            <div className="flex flex-col -space-y-1">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0 || isPending}
                                                    className="text-gray-300 dark:text-neutral-600 hover:text-gray-500 dark:hover:text-neutral-400 disabled:opacity-30 p-0.5"
                                                    title="Move up"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                                        <path fillRule="evenodd" d="M8 3.5a.5.5 0 0 1 .354.146l3 3a.5.5 0 0 1-.708.708L8 4.707 5.354 7.354a.5.5 0 1 1-.708-.708l3-3A.5.5 0 0 1 8 3.5z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === tools.length - 1 || isPending}
                                                    className="text-gray-300 dark:text-neutral-600 hover:text-gray-500 dark:hover:text-neutral-400 disabled:opacity-30 p-0.5"
                                                    title="Move down"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                                                        <path fillRule="evenodd" d="M8 12.5a.5.5 0 0 1-.354-.146l-3-3a.5.5 0 1 1 .708-.708L8 11.293l2.646-2.647a.5.5 0 1 1 .708.708l-3 3A.5.5 0 0 1 8 12.5z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Name */}
                                    <td className="px-4 py-3">
                                        <span className="font-medium text-gray-900 dark:text-neutral-100">
                                            {tool.name}
                                        </span>
                                        {tool.description && (
                                            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5 line-clamp-1">
                                                {tool.description}
                                            </p>
                                        )}
                                    </td>

                                    {/* URL */}
                                    <td className="px-4 py-3 hidden md:table-cell">
                                        <a
                                            href={tool.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[200px] block"
                                        >
                                            {tool.url.replace(/^https?:\/\//, '')}
                                        </a>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggleActive(tool)}
                                            disabled={isPending}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${tool.active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-400'
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${tool.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                            {tool.active ? 'Active' : 'Inactive'}
                                        </button>
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => { setEditingTool(tool); setShowForm(false); }}
                                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                            >
                                                Edit
                                            </button>
                                            {deleteConfirm === tool.id ? (
                                                <div className="flex items-center gap-1">
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delete confirmation overlay for smaller viewports */}
            {deleteConfirm && (
                <div className="sr-only" aria-live="polite">
                    Are you sure you want to delete this tool?
                </div>
            )}
        </div>
    );
}
