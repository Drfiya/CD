'use client';

/**
 * Unified Command Center Board — Client component.
 * Shows both GitHub-synced code cards and manual task cards
 * in 3 unified columns (To Do / In Progress / Done).
 * Filter tabs: All | Code | Tasks.
 */

import { useState, useCallback, useTransition } from 'react';
import {
    syncDevTracker,
    updateCardColumn,
    type UnifiedBoardData,
    type UnifiedCardData,
    type RecentCommit,
    getUnifiedBoard,
} from '@/lib/dev-tracker/actions';
import {
    createKanbanCard,
    moveKanbanCard,
    deleteKanbanCard,
    type KanbanCardData,
} from '@/lib/kanban-actions';
import type { TrackerCard, TrackerStats } from '@/lib/dev-tracker/sync';
import type { KanbanStatus } from '@/generated/prisma/client';

// --- Column definitions ---

const COLUMNS = [
    { id: 'todo', label: 'To Do', color: '#3b82f6' },
    { id: 'in_progress', label: 'In Progress', color: '#eab308' },
    { id: 'done', label: 'Done', color: '#22c55e' },
] as const;

type FilterTab = 'all' | 'code' | 'tasks';

// --- Relative time helper ---

function timeAgo(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
}

// --- GitHub card freshness badge ---

function FreshnessDot({ freshness }: { freshness: string }) {
    const colors: Record<string, string> = {
        green: 'bg-green-400',
        yellow: 'bg-yellow-400',
        gray: 'bg-gray-300',
    };
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full ${colors[freshness] || 'bg-gray-300'}`}
            title={freshness === 'green' ? 'Active (< 7 days)' : freshness === 'yellow' ? 'Stale (> 7 days)' : 'Inactive'}
        />
    );
}

// --- Topic badge ---

function TopicBadge({ label }: { label: string }) {
    return (
        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 mr-1">
            {label}
        </span>
    );
}

// --- Recent Activity Feed ---

function RecentActivity({ commits }: { commits: RecentCommit[] }) {
    const [collapsed, setCollapsed] = useState(false);

    if (commits.length === 0) return null;

    // Normalize author names
    const normalizeAuthor = (name: string) => {
        const lower = name.toLowerCase();
        if (lower.includes('lutfiya') || lower === 'drfiya') return 'Lutfiya';
        if (lower.includes('chris') || lower === 'chriss54') return 'Chris';
        return name.split(' ')[0]; // first name only
    };

    return (
        <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl p-4">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-neutral-300 hover:text-gray-900 dark:hover:text-neutral-100 transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <span className="text-base">⚡</span> Recent Activity
                    <span className="text-[10px] font-normal text-gray-400 dark:text-neutral-500">({commits.length})</span>
                </span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            {!collapsed && (
                <div className="space-y-0 mt-3">
                    {commits.map((commit, i) => {
                        const author = normalizeAuthor(commit.authorName);
                        const initial = author[0]?.toUpperCase() || '?';
                        const isLast = i === commits.length - 1;
                        return (
                            <div key={commit.sha} className="flex items-start gap-3 relative">
                                {/* Timeline line */}
                                {!isLast && (
                                    <div className="absolute left-[11px] top-[24px] w-px h-[calc(100%-8px)] bg-gray-200 dark:bg-neutral-700" />
                                )}
                                {/* Author avatar */}
                                <span className="w-[22px] h-[22px] rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-[10px] font-bold flex items-center justify-center text-indigo-700 dark:text-indigo-300 shrink-0 z-10 mt-0.5">
                                    {initial}
                                </span>
                                {/* Content */}
                                <div className={`flex-1 min-w-0 pb-3 ${!isLast ? 'border-b-0' : ''}`}>
                                    <div className="flex items-baseline justify-between gap-2">
                                        <p className="text-xs text-gray-800 dark:text-neutral-200 truncate">
                                            {commit.message}
                                        </p>
                                        <span className="text-[10px] text-gray-400 dark:text-neutral-500 shrink-0">
                                            {timeAgo(commit.date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-gray-400 dark:text-neutral-500">{author}</span>
                                        <code className="text-[10px] text-gray-400 dark:text-neutral-500 font-mono">
                                            {commit.sha.substring(0, 7)}
                                        </code>
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

// --- GitHub Card ---

function GitHubCardUI({
    card,
    onDragStart,
}: {
    card: TrackerCard;
    onDragStart: (e: React.DragEvent, id: string) => void;
}) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, card.branchName)}
            className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 cursor-grab active:cursor-grabbing
                       hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all group"
        >
            {/* Title row */}
            <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                    <FreshnessDot freshness={card.freshness} />
                    <span className="text-xs font-semibold text-gray-800 dark:text-neutral-200 truncate">{card.title}</span>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 shrink-0">🔧</span>
            </div>

            {/* Topic tag */}
            {card.platformTagLabel && (
                <div className="mb-1.5"><TopicBadge label={card.platformTagLabel} /></div>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-neutral-400">
                <span>{card.commitCount} commit{card.commitCount !== 1 ? 's' : ''}</span>
                {card.lastCommitDate && (
                    <span className="text-gray-400 dark:text-neutral-500">{timeAgo(card.lastCommitDate)}</span>
                )}
                {card.prNumber && (
                    <span className="text-amber-600">PR #{card.prNumber}</span>
                )}
                {card.flagged && <span className="text-red-500">🔴</span>}
            </div>

            {/* Authors */}
            <div className="flex gap-1 mt-1.5">
                {card.authors.map((a) => (
                    <span
                        key={a}
                        className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-600 text-[9px] font-bold flex items-center justify-center text-gray-600 dark:text-neutral-300"
                        title={a}
                    >
                        {a[0]}
                    </span>
                ))}
            </div>
        </div>
    );
}

// --- Manual Task Card ---

function ManualCardUI({
    card,
    onDragStart,
    onDelete,
}: {
    card: Extract<UnifiedCardData, { source: 'manual' }>;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDelete: (id: string) => void;
}) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, card.id)}
            className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-3 cursor-grab active:cursor-grabbing
                       hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
        >
            {/* Image */}
            {card.imageUrl && (
                <div className="mb-2 -mt-1 -mx-1 rounded-t overflow-hidden">
                    <img src={card.imageUrl} alt="" className="w-full h-24 object-cover" />
                </div>
            )}

            {/* Title row */}
            <div className="flex items-start justify-between gap-1 mb-1">
                <span className="text-xs font-semibold text-gray-800 dark:text-neutral-200">{card.title}</span>
                <span className="text-[10px] text-gray-400 dark:text-neutral-500 shrink-0">📋</span>
            </div>

            {/* Description */}
            {card.description && (
                <p className="text-[10px] text-gray-500 dark:text-neutral-400 line-clamp-2 mb-1.5">{card.description}</p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-1">
                    {card.createdBy.image ? (
                        <img src={card.createdBy.image} className="w-5 h-5 rounded-full" alt="" />
                    ) : card.createdBy.name ? (
                        <span className="w-5 h-5 rounded-full bg-blue-200 text-[9px] font-bold flex items-center justify-center text-blue-700">
                            {card.createdBy.name[0]}
                        </span>
                    ) : null}
                    <span className="text-[10px] text-gray-400 dark:text-neutral-500">{card.createdBy.name}</span>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-red-400 hover:text-red-600 transition-opacity"
                    title="Delete task"
                >
                    ✕
                </button>
            </div>
        </div>
    );
}

// --- Column ---

function ColumnUI({
    id,
    label,
    color,
    cards,
    filter,
    onDragStart,
    onDrop,
    onDeleteManual,
}: {
    id: string;
    label: string;
    color: string;
    cards: UnifiedCardData[];
    filter: FilterTab;
    onDragStart: (e: React.DragEvent, cardId: string) => void;
    onDrop: (cardId: string, column: string) => void;
    onDeleteManual: (id: string) => void;
}) {
    // Apply filter
    const filteredCards = cards.filter((c) => {
        if (filter === 'code') return c.source === 'github';
        if (filter === 'tasks') return c.source === 'manual';
        return true;
    });

    return (
        <div
            className="flex-1 min-w-[240px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
                e.preventDefault();
                const cardId = e.dataTransfer.getData('text/plain');
                if (cardId) onDrop(cardId, id);
            }}
        >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-semibold text-gray-700 dark:text-neutral-300">{label}</span>
                <span className="text-[10px] text-gray-400 bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded-full">
                    {filteredCards.length}
                </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[80px] p-1 rounded-lg bg-gray-50/50 dark:bg-neutral-800/50">
                {filteredCards.length === 0 ? (
                    <div className="text-center py-6 text-xs text-gray-400 dark:text-neutral-500">
                        Drag cards here
                    </div>
                ) : (
                    filteredCards.map((card) => {
                        if (card.source === 'github') {
                            return (
                                <GitHubCardUI
                                    key={card.id}
                                    card={card.card}
                                    onDragStart={onDragStart}
                                />
                            );
                        }
                        return (
                            <ManualCardUI
                                key={card.id}
                                card={card}
                                onDragStart={onDragStart}
                                onDelete={onDeleteManual}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}

// --- Stats header ---

function StatsHeader({ stats, manualCount }: { stats: TrackerStats; manualCount: number }) {
    const items = [
        { label: 'Features', value: stats.totalFeatures },
        { label: 'Active', value: stats.activeFeatures, color: 'text-green-600' },
        { label: 'Shipped', value: stats.shippedFeatures, color: 'text-indigo-600' },
        { label: 'Tasks', value: manualCount, color: 'text-blue-600' },
        { label: 'Commits This Week', value: stats.commitsThisWeek },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {items.map(({ label, value, color }) => (
                <div key={label} className="bg-gray-50 dark:bg-neutral-800 rounded-lg px-4 py-3">
                    <div className="text-[10px] text-gray-500 dark:text-neutral-400 font-medium">{label}</div>
                    <div className={`text-xl font-bold ${color || 'text-gray-800 dark:text-neutral-200'}`}>{value}</div>
                </div>
            ))}
        </div>
    );
}

// --- Team time zones ---

function TeamTimezones() {
    const format = (tz: string) => {
        try {
            return new Date().toLocaleTimeString('en-US', {
                timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true,
            });
        } catch { return '—'; }
    };

    return (
        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-neutral-400">
            <span className="font-medium">Build Tracker</span>
            <span>🇺🇸 {format('America/Chicago')}</span>
            <span>🇩🇪 {format('Europe/Berlin')}</span>
        </div>
    );
}

// --- New task modal ---

function AddTaskForm({ onSubmit, onCancel }: {
    onSubmit: (title: string, description?: string) => void;
    onCancel: () => void;
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    return (
        <div className="bg-white dark:bg-neutral-800 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
            <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title…"
                className="w-full text-xs border border-gray-200 dark:border-neutral-600 rounded px-2 py-1.5 bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && title.trim()) onSubmit(title.trim(), description.trim() || undefined);
                    if (e.key === 'Escape') onCancel();
                }}
            />
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)…"
                rows={2}
                className="w-full text-xs border border-gray-200 dark:border-neutral-600 rounded px-2 py-1.5 bg-white dark:bg-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
            />
            <div className="flex gap-1.5 justify-end">
                <button onClick={onCancel} className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1">Cancel</button>
                <button
                    onClick={() => title.trim() && onSubmit(title.trim(), description.trim() || undefined)}
                    disabled={!title.trim()}
                    className="text-[10px] font-medium bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    Add Task
                </button>
            </div>
        </div>
    );
}

// --- Main board component ---

interface TrackerBoardProps {
    initialData: UnifiedBoardData | null;
}

export function TrackerBoard({ initialData }: TrackerBoardProps) {
    const [data, setData] = useState(initialData);
    const [filter, setFilter] = useState<FilterTab>('all');
    const [showAddTask, setShowAddTask] = useState(false);
    const [isPending, startTransition] = useTransition();

    // --- Group cards by column ---
    const cardsByColumn: Record<string, UnifiedCardData[]> = {
        todo: [], in_progress: [], done: [],
    };
    if (data) {
        for (const card of data.cards) {
            cardsByColumn[card.column]?.push(card);
        }
    }

    const manualCount = data?.cards.filter((c) => c.source === 'manual').length ?? 0;

    // --- Sync handler ---
    const handleSync = useCallback(() => {
        startTransition(async () => {
            try {
                const result = await getUnifiedBoard();
                setData(result);
            } catch (err) {
                console.error('Sync failed:', err);
            }
        });
    }, []);

    // --- Drag-and-drop ---
    const handleDragStart = useCallback((e: React.DragEvent, cardId: string) => {
        e.dataTransfer.setData('text/plain', cardId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDrop = useCallback((cardId: string, targetColumn: string) => {
        if (!data) return;

        // Find the card
        const card = data.cards.find((c) => c.id === cardId);
        if (!card || card.column === targetColumn) return;

        // Optimistic update
        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                cards: prev.cards.map((c) =>
                    c.id === cardId ? { ...c, column: targetColumn as 'todo' | 'in_progress' | 'done' } : c
                ),
            };
        });

        // Persist to DB
        startTransition(async () => {
            try {
                if (card.source === 'github') {
                    // Map unified column back to DevTrackerCard column
                    const devCol = targetColumn === 'todo' ? 'active'
                        : targetColumn === 'in_progress' ? 'pr_open'
                            : 'merged';
                    await updateCardColumn(cardId, devCol);
                } else {
                    // Map unified column back to KanbanStatus
                    const statusMap: Record<string, KanbanStatus> = {
                        todo: 'TODO', in_progress: 'IN_PROGRESS', done: 'DONE',
                    };
                    await moveKanbanCard(cardId, statusMap[targetColumn], 0);
                }
            } catch (err) {
                console.error('Move failed:', err);
                // Revert on error
                const result = await getUnifiedBoard();
                setData(result);
            }
        });
    }, [data]);

    // --- Add task ---
    const handleAddTask = useCallback((title: string, description?: string) => {
        setShowAddTask(false);
        startTransition(async () => {
            try {
                await createKanbanCard({ title, description });
                const result = await getUnifiedBoard();
                setData(result);
            } catch (err) {
                console.error('Create failed:', err);
            }
        });
    }, []);

    // --- Delete manual task ---
    const handleDeleteManual = useCallback((id: string) => {
        // Optimistic remove
        setData((prev) => {
            if (!prev) return prev;
            return { ...prev, cards: prev.cards.filter((c) => c.id !== id) };
        });

        startTransition(async () => {
            try {
                await deleteKanbanCard(id);
            } catch (err) {
                console.error('Delete failed:', err);
                const result = await getUnifiedBoard();
                setData(result);
            }
        });
    }, []);

    // --- Filter tab counts ---
    const codeCount = data?.cards.filter((c) => c.source === 'github').length ?? 0;
    const taskCount = manualCount;
    const allCount = (data?.cards.length ?? 0);

    // --- Empty state ---
    if (!data) {
        return (
            <div className="text-center py-16 space-y-4">
                <p className="text-sm text-gray-500 dark:text-neutral-400">Click Sync to pull data from GitHub</p>
                <button
                    onClick={handleSync}
                    disabled={isPending}
                    className="px-4 py-2 bg-gray-900 dark:bg-neutral-200 text-white dark:text-neutral-900 text-sm rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-300 disabled:opacity-50"
                >
                    {isPending ? '⏳ Syncing…' : '🔄 Initial Sync'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header: time zones + sync */}
            <div className="flex items-center justify-between">
                <TeamTimezones />
                <div className="flex items-center gap-3">
                    {data.syncedAt && (
                        <span className="text-[10px] text-gray-400">
                            Last sync: {new Date(data.syncedAt).toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-gray-900 dark:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-300 disabled:opacity-50 flex items-center gap-1"
                    >
                        {isPending ? '⏳' : '🔄'} Sync
                    </button>
                </div>
            </div>

            {/* Stats */}
            <StatsHeader stats={data.stats} manualCount={manualCount} />

            {/* Recent Activity */}
            {data.recentCommits && data.recentCommits.length > 0 && (
                <RecentActivity commits={data.recentCommits} />
            )}

            {/* Filter tabs + Add task button */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5">
                    {([
                        { key: 'all' as FilterTab, label: 'All', count: allCount },
                        { key: 'code' as FilterTab, label: '🔧 Code', count: codeCount },
                        { key: 'tasks' as FilterTab, label: '📋 Tasks', count: taskCount },
                    ]).map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === key
                                ? 'bg-white dark:bg-neutral-600 text-gray-800 dark:text-neutral-100 shadow-sm'
                                : 'text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200'
                                }`}
                        >
                            {label} <span className="text-gray-400 ml-0.5">({count})</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowAddTask(true)}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                >
                    + Add Task
                </button>
            </div>

            {/* Add task form */}
            {showAddTask && (
                <AddTaskForm
                    onSubmit={handleAddTask}
                    onCancel={() => setShowAddTask(false)}
                />
            )}

            {/* Board columns */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map(({ id, label, color }) => (
                    <ColumnUI
                        key={id}
                        id={id}
                        label={label}
                        color={color}
                        cards={cardsByColumn[id] || []}
                        filter={filter}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                        onDeleteManual={handleDeleteManual}
                    />
                ))}
            </div>
        </div>
    );
}
