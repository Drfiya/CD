'use client';

/**
 * Launch Control — Launch readiness dashboard.
 * Category-based checklists with an overall readiness score.
 */

import { useState, useTransition } from 'react';
import {
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
} from '@/lib/dev-tracker/actions';

// --- Types ---

interface ChecklistItem {
    id: string;
    category: string;
    label: string;
    checked: boolean;
    autoChecked: boolean;
    blocker: boolean;
    position: number;
}

interface LaunchControlProps {
    initialItems: ChecklistItem[];
}

// --- Category config ---

const CATEGORIES = [
    { id: 'technical', label: 'Technical', emoji: '⚙️', weight: 0.30 },
    { id: 'testing', label: 'Testing', emoji: '🧪', weight: 0.20 },
    { id: 'payments', label: 'Payments', emoji: '💳', weight: 0.20 },
    { id: 'content', label: 'Content', emoji: '📝', weight: 0.15 },
    { id: 'legal', label: 'Legal & Compliance', emoji: '⚖️', weight: 0.10 },
    { id: 'operations', label: 'Operations', emoji: '🔧', weight: 0.05 },
];

// --- Score calculation ---

function computeScores(items: ChecklistItem[]) {
    const byCategory: Record<string, { total: number; checked: number }> = {};

    for (const cat of CATEGORIES) {
        byCategory[cat.id] = { total: 0, checked: 0 };
    }

    for (const item of items) {
        if (!byCategory[item.category]) continue;
        byCategory[item.category].total++;
        if (item.checked) byCategory[item.category].checked++;
    }

    // Per-category percentage
    const categoryScores: Record<string, number> = {};
    for (const cat of CATEGORIES) {
        const { total, checked } = byCategory[cat.id];
        categoryScores[cat.id] = total > 0 ? Math.round((checked / total) * 100) : 0;
    }

    // Weighted overall score
    let overall = 0;
    for (const cat of CATEGORIES) {
        overall += categoryScores[cat.id] * cat.weight;
    }

    // Cap at 80% if any blocker is unchecked
    const hasBlocker = items.some((i) => i.blocker && !i.checked);
    if (hasBlocker && overall > 80) overall = 80;

    return {
        overall: Math.round(overall),
        categoryScores,
        hasBlocker,
    };
}

// --- Score ring ---

function ScoreRing({ score, hasBlocker }: { score: number; hasBlocker: boolean }) {
    const color =
        score >= 80 ? 'text-green-500' :
            score >= 60 ? 'text-yellow-500' :
                'text-red-500';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className={`text-5xl font-bold ${color}`}>{score}%</div>
            <p className="text-sm text-gray-500">Launch Readiness</p>
            {hasBlocker && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    ⚠️ Blockers present — score capped at 80%
                </span>
            )}
        </div>
    );
}

// --- Add item form ---

function AddItemForm({
    category,
    onAdded,
}: {
    category: string;
    onAdded: () => void;
}) {
    const [label, setLabel] = useState('');
    const [blocker, setBlocker] = useState(false);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!label.trim()) return;

        startTransition(async () => {
            await addChecklistItem({
                category,
                label: label.trim(),
                blocker,
            });
            setLabel('');
            setBlocker(false);
            onAdded();
        });
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2">
            <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Add checklist item…"
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
            />
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input
                    type="checkbox"
                    checked={blocker}
                    onChange={(e) => setBlocker(e.target.checked)}
                    className="rounded"
                />
                Blocker
            </label>
            <button
                type="submit"
                disabled={isPending || !label.trim()}
                className="px-3 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                Add
            </button>
        </form>
    );
}

// --- Category section ---

function CategorySection({
    category,
    emoji,
    label,
    score,
    items,
    onRefresh,
}: {
    category: string;
    emoji: string;
    label: string;
    score: number;
    items: ChecklistItem[];
    onRefresh: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [showAdd, setShowAdd] = useState(false);

    const handleToggle = (id: string, checked: boolean) => {
        startTransition(async () => {
            await toggleChecklistItem(id, checked);
            onRefresh();
        });
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            await deleteChecklistItem(id);
            onRefresh();
        });
    };

    const barColor =
        score >= 80 ? 'bg-green-400' :
            score >= 60 ? 'bg-yellow-400' :
                'bg-red-400';

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{emoji}</span>
                    <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                </div>
                <span className="text-sm font-bold text-gray-600">{score}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
                <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Items */}
            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 group">
                        <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => handleToggle(item.id, e.target.checked)}
                            disabled={isPending}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span
                            className={`text-sm flex-1 ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'
                                }`}
                        >
                            {item.label}
                        </span>
                        {item.blocker && (
                            <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                                blocker
                            </span>
                        )}
                        <button
                            onClick={() => handleDelete(item.id)}
                            disabled={isPending}
                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {/* Add item */}
            <button
                onClick={() => setShowAdd(!showAdd)}
                className="mt-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
                {showAdd ? 'Cancel' : '+ Add item'}
            </button>
            {showAdd && <AddItemForm category={category} onAdded={onRefresh} />}
        </div>
    );
}

// --- Main component ---

export function LaunchControl({ initialItems }: LaunchControlProps) {
    const [items, setItems] = useState(initialItems);

    const scores = computeScores(items);

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="space-y-8">
            {/* Readiness score */}
            <div className="flex justify-center py-6">
                <ScoreRing score={scores.overall} hasBlocker={scores.hasBlocker} />
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map(({ id, label, emoji, weight }) => (
                    <CategorySection
                        key={id}
                        category={id}
                        emoji={emoji}
                        label={label}
                        score={scores.categoryScores[id]}
                        items={items.filter((i) => i.category === id)}
                        onRefresh={handleRefresh}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="text-center text-xs text-gray-400">
                Weights: {CATEGORIES.map((c) => `${c.label} (${Math.round(c.weight * 100)}%)`).join(' · ')}
            </div>
        </div>
    );
}
