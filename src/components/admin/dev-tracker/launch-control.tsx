'use client';

/**
 * Launch Control — Launch readiness dashboard.
 * Auto-detection checks + manual items, weighted scoring, blocker detection.
 */

import { useState, useTransition } from 'react';
import {
    toggleChecklistItem,
    addChecklistItem,
    deleteChecklistItem,
} from '@/lib/dev-tracker/actions';
import { runLaunchChecks } from '@/lib/dev-tracker/launch-checks';

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

    const categoryScores: Record<string, number> = {};
    for (const cat of CATEGORIES) {
        const { total, checked } = byCategory[cat.id];
        categoryScores[cat.id] = total > 0 ? Math.round((checked / total) * 100) : 0;
    }

    let overall = 0;
    for (const cat of CATEGORIES) {
        overall += categoryScores[cat.id] * cat.weight;
    }

    const hasBlocker = items.some((i) => i.blocker && !i.checked);
    if (hasBlocker && overall > 80) overall = 80;

    return {
        overall: Math.round(overall),
        categoryScores,
        hasBlocker,
    };
}

// --- Score display ---

function ScoreRing({ score, hasBlocker }: { score: number; hasBlocker: boolean }) {
    const color =
        score >= 80 ? 'text-green-500' :
            score >= 60 ? 'text-yellow-500' :
                'text-red-500';

    const bgRing =
        score >= 80 ? 'border-green-200 bg-green-50' :
            score >= 60 ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50';

    return (
        <div className="flex flex-col items-center gap-3">
            <div className={`w-32 h-32 rounded-full border-4 ${bgRing} flex items-center justify-center`}>
                <div className={`text-4xl font-bold ${color}`}>{score}%</div>
            </div>
            <p className="text-sm font-medium text-gray-600">Launch Readiness</p>
            {hasBlocker && (
                <span className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                    ⚠️ Blockers present — score capped at 80%
                </span>
            )}
        </div>
    );
}

// --- Scan button ---

function ScanButton({ onComplete }: { onComplete: (summary: string) => void }) {
    const [scanning, startScan] = useTransition();
    const [lastScanSummary, setLastScanSummary] = useState<string | null>(null);

    const handleScan = () => {
        startScan(async () => {
            const { summary } = await runLaunchChecks();
            setLastScanSummary(summary);
            onComplete(summary);
        });
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <button
                onClick={handleScan}
                disabled={scanning}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {scanning ? '🔍 Scanning project…' : '🔍 Run Readiness Scan'}
            </button>
            {lastScanSummary && (
                <p className="text-xs text-gray-500">{lastScanSummary}</p>
            )}
        </div>
    );
}

// --- Add manual item ---

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
                placeholder="Add manual item…"
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

    const autoItems = items.filter((i) => i.autoChecked);
    const manualItems = items.filter((i) => !i.autoChecked);

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
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
                <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${score}%` }}
                />
            </div>

            {/* Auto-detected items */}
            {autoItems.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Auto-detected</p>
                    {autoItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                            <span className="text-sm w-5 text-center shrink-0">
                                {item.checked ? '✅' : '❌'}
                            </span>
                            <span
                                className={`text-sm flex-1 ${item.checked ? 'text-gray-500' : 'text-gray-800 font-medium'
                                    }`}
                            >
                                {item.label}
                            </span>
                            {item.blocker && !item.checked && (
                                <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                                    blocker
                                </span>
                            )}
                            <span className="text-[10px] text-gray-300 px-1.5 py-0.5 rounded bg-gray-50">
                                auto
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Manual items */}
            {manualItems.length > 0 && (
                <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Manual</p>
                    {manualItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                            <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => handleToggle(item.id, e.target.checked)}
                                disabled={isPending}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <span
                                className={`text-sm flex-1 ${item.checked ? 'text-gray-400 line-through' : 'text-gray-700'
                                    }`}
                            >
                                {item.label}
                            </span>
                            {item.blocker && !item.checked && (
                                <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
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
            )}

            {/* Empty state */}
            {items.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">
                    Run a scan to auto-populate, or add manually
                </p>
            )}

            {/* Add manual item */}
            <button
                onClick={() => setShowAdd(!showAdd)}
                className="mt-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
            >
                {showAdd ? 'Cancel' : '+ Add manual item'}
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

    const passedCount = items.filter((i) => i.checked).length;
    const totalCount = items.length;
    const blockerCount = items.filter((i) => i.blocker && !i.checked).length;

    return (
        <div className="space-y-8">
            {/* Readiness score + scan button */}
            <div className="flex flex-col items-center gap-6 py-6">
                <ScoreRing score={scores.overall} hasBlocker={scores.hasBlocker} />

                <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>✅ {passedCount} passed</span>
                    <span>📋 {totalCount} total</span>
                    {blockerCount > 0 && (
                        <span className="text-red-600 font-medium">🚫 {blockerCount} blockers</span>
                    )}
                </div>

                <ScanButton onComplete={handleRefresh} />
            </div>

            {/* Category grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CATEGORIES.map(({ id, label, emoji }) => (
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
            <div className="text-center space-y-1">
                <p className="text-xs text-gray-400">
                    Weights: {CATEGORIES.map((c) => `${c.label} (${Math.round(c.weight * 100)}%)`).join(' · ')}
                </p>
                <p className="text-xs text-gray-400">
                    <span className="bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">auto</span> = detected by system scan ·
                    ☑️ = manually toggled by you
                </p>
            </div>
        </div>
    );
}
