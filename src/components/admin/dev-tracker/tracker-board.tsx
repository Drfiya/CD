'use client';

/**
 * Dev Tracker Board — Client component.
 * Kanban board with GitHub-synced cards, drag-and-drop columns,
 * stats header, and topic tags.
 */

import { useState, useCallback, useTransition } from 'react';
import { syncDevTracker, saveCardMeta, updateCardColumn } from '@/lib/dev-tracker/actions';
import type { SyncResponse } from '@/lib/dev-tracker/actions';
import type { TrackerCard, TrackerStats } from '@/lib/dev-tracker/sync';

// --- Column config ---

const COLUMNS = [
    { id: 'active', label: 'Active', color: '#22c55e' },
    { id: 'pr_open', label: 'PR Open', color: '#eab308' },
    { id: 'merged', label: 'Merged / Done', color: '#6366f1' },
    { id: 'follow_up', label: 'Needs Follow-Up', color: '#ef4444' },
] as const;

// --- Freshness badge ---

function FreshnessDot({ freshness }: { freshness: string }) {
    const colors: Record<string, string> = {
        green: 'bg-green-400',
        yellow: 'bg-yellow-400',
        gray: 'bg-gray-400',
    };
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full ${colors[freshness] || colors.gray}`}
            title={freshness === 'green' ? 'Active today' : freshness === 'yellow' ? 'Active this week' : 'Stale'}
        />
    );
}

// --- Topic badge ---

function TopicBadge({ label }: { label: string }) {
    return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
            {label}
        </span>
    );
}

// --- Card ---

function TrackerCardUI({
    card,
    onDragStart,
}: {
    card: TrackerCard;
    onDragStart: (e: React.DragEvent, branchName: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, card.branchName)}
            onClick={() => setExpanded(!expanded)}
            className="bg-white border border-gray-200 rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <FreshnessDot freshness={card.freshness} />
                    <span className="text-sm font-medium text-gray-900 truncate">{card.title}</span>
                </div>
                {card.flagged && <span className="text-red-500 text-xs">🚩</span>}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
                {card.platformTagLabel && <TopicBadge label={card.platformTagLabel} />}
                <span className="text-xs text-gray-500">{card.commitCount} commits</span>
                {card.prNumber && (
                    <a
                        href={`https://github.com/Drfiya/CD/pull/${card.prNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                    >
                        PR #{card.prNumber}
                    </a>
                )}
            </div>

            {/* Authors */}
            <div className="flex items-center gap-1 mt-2">
                {card.authors.map((author) => (
                    <span
                        key={author}
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-xs font-medium text-gray-700"
                        title={author}
                    >
                        {author[0]}
                    </span>
                ))}
            </div>

            {/* Expanded details */}
            {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-xs text-gray-500">
                        Branch: <code className="bg-gray-100 px-1 rounded">{card.branchName}</code>
                    </p>
                    {card.lastCommitDate && (
                        <p className="text-xs text-gray-500">
                            Last commit: {new Date(card.lastCommitDate).toLocaleDateString()}
                        </p>
                    )}
                    {card.notes && (
                        <p className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">{card.notes}</p>
                    )}
                    {card.priority && (
                        <p className="text-xs text-gray-500">
                            Priority:{' '}
                            <span className={card.priority === 'high' ? 'text-red-600 font-medium' : ''}>
                                {card.priority}
                            </span>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// --- Column ---

function KanbanColumnUI({
    id,
    label,
    color,
    cards,
    onDragStart,
    onDrop,
}: {
    id: string;
    label: string;
    color: string;
    cards: TrackerCard[];
    onDragStart: (e: React.DragEvent, branchName: string) => void;
    onDrop: (branchName: string, column: string) => void;
}) {
    const [dragOver, setDragOver] = useState(false);

    return (
        <div
            className={`flex-1 min-w-[260px] rounded-xl border transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-gray-50/50'
                }`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const branchName = e.dataTransfer.getData('text/plain');
                if (branchName) onDrop(branchName, id);
            }}
        >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                    {cards.length}
                </span>
            </div>

            {/* Cards */}
            <div className="p-3 space-y-2 min-h-[100px]">
                {cards.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No items</p>
                ) : (
                    cards.map((card) => (
                        <TrackerCardUI key={card.branchName} card={card} onDragStart={onDragStart} />
                    ))
                )}
            </div>
        </div>
    );
}

// --- Stats header ---

function StatsHeader({ stats }: { stats: TrackerStats }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500">Features</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFeatures}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.activeFeatures}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500">Shipped</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.shippedFeatures}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-500">Commits This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.commitsThisWeek}</p>
            </div>
        </div>
    );
}

// --- Topic tags ---

function TopicTags({ topics }: { topics: TrackerStats['topTopics'] }) {
    if (topics.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">Top areas:</span>
            {topics.map(({ topic, label, count }) => (
                <span
                    key={topic}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                    {label}
                    <span className="text-indigo-400">({count})</span>
                </span>
            ))}
        </div>
    );
}

// --- Team time zones ---

function TeamTimezones() {
    const now = new Date();

    const usTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    const deTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Europe/Berlin',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });

    return (
        <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>🇺🇸 {usTime}</span>
            <span>🇩🇪 {deTime}</span>
        </div>
    );
}

// --- Main board component ---

interface TrackerBoardProps {
    initialData: SyncResponse | null;
}

export function TrackerBoard({ initialData }: TrackerBoardProps) {
    const [data, setData] = useState<SyncResponse | null>(initialData);
    const [isSyncing, startSync] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const cards = data?.cards || [];
    const stats = data?.stats || {
        totalFeatures: 0,
        activeFeatures: 0,
        shippedFeatures: 0,
        commitsThisWeek: 0,
        topTopics: [],
    };

    const handleSync = useCallback(() => {
        setError(null);
        startSync(async () => {
            try {
                const result = await syncDevTracker();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Sync failed');
            }
        });
    }, []);

    const handleDragStart = useCallback((e: React.DragEvent, branchName: string) => {
        e.dataTransfer.setData('text/plain', branchName);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDrop = useCallback(
        (branchName: string, column: string) => {
            // Optimistic update
            setData((prev) => {
                if (!prev) return prev;
                const updatedCards = prev.cards.map((c) =>
                    c.branchName === branchName ? { ...c, column } : c
                );
                return { ...prev, cards: updatedCards };
            });

            // Persist to DB
            updateCardColumn(branchName, column).catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to save');
            });
        },
        []
    );

    const cardsForColumn = useCallback(
        (columnId: string) =>
            cards
                .filter((c) => c.column === columnId)
                .sort((a, b) => {
                    // Flagged first, then by recency
                    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
                    const dateA = a.lastCommitDate ? new Date(a.lastCommitDate).getTime() : 0;
                    const dateB = b.lastCommitDate ? new Date(b.lastCommitDate).getTime() : 0;
                    return dateB - dateA;
                }),
        [cards]
    );

    return (
        <div className="space-y-6">
            {/* Top bar */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-semibold text-gray-900">Build Tracker</h2>
                    <TeamTimezones />
                </div>
                <div className="flex items-center gap-3">
                    {data?.syncedAt && (
                        <span className="text-xs text-gray-400">
                            Last sync: {new Date(data.syncedAt).toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isSyncing ? 'Syncing…' : '🔄 Sync'}
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Stats */}
            <StatsHeader stats={stats} />

            {/* Topic tags */}
            <TopicTags topics={stats.topTopics} />

            {/* Kanban */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                {COLUMNS.map(({ id, label, color }) => (
                    <KanbanColumnUI
                        key={id}
                        id={id}
                        label={label}
                        color={color}
                        cards={cardsForColumn(id)}
                        onDragStart={handleDragStart}
                        onDrop={handleDrop}
                    />
                ))}
            </div>

            {/* No data state */}
            {!data && !isSyncing && (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">Click Sync to pull data from GitHub</p>
                    <button
                        onClick={handleSync}
                        className="px-6 py-3 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                        🔄 Initial Sync
                    </button>
                </div>
            )}
        </div>
    );
}
