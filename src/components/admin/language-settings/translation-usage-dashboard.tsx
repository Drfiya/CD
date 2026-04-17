'use client';

/**
 * Translation API Usage Dashboard
 *
 * Live dashboard showing DeepL translation API usage, cache performance,
 * and cost projections. Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useTransition } from 'react';
import type { TranslationUsageData } from '@/lib/language-settings/actions';
import { getTranslationUsageData, toggleKillSwitch, setDailyBudget } from '@/lib/language-settings/actions';

// --- Format helpers ---

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

function formatCost(n: number): string {
    if (n === 0) return '\u2014';
    if (n < 0.01) return '<$0.01';
    return `$${n.toFixed(2)}`;
}

// --- Summary Card ---

function SummaryCard({
    label,
    value,
    subtext,
    badge,
}: {
    label: string;
    value: string;
    subtext?: string;
    badge?: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                {label}
            </p>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
                    {value}
                </p>
                {badge}
            </div>
            {subtext && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                    {subtext}
                </p>
            )}
        </div>
    );
}

// --- Cache Hit Rate Badge ---

function CacheHitRateBadge({ rate }: { rate: number }) {
    const badgeClass =
        rate >= 80
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            : rate >= 50
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';

    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
            {rate}%
        </span>
    );
}

// --- Main Component ---

interface TranslationUsageDashboardProps {
    initialData: TranslationUsageData;
}

export function TranslationUsageDashboard({ initialData }: TranslationUsageDashboardProps) {
    const [data, setData] = useState<TranslationUsageData>(initialData);
    const [isPending, startTransition] = useTransition();

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            startTransition(async () => {
                try {
                    const fresh = await getTranslationUsageData();
                    setData(fresh);
                } catch {
                    // Silently fail — keep stale data
                }
            });
        }, 30_000);

        return () => clearInterval(interval);
    }, []);

    const lastUpdated = new Date().toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    function handleRefresh() {
        startTransition(async () => {
            try {
                const fresh = await getTranslationUsageData();
                setData(fresh);
            } catch {
                // Silently fail
            }
        });
    }

    // Cost projection: extrapolate current month usage to end of month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedCost = dayOfMonth > 0 ? (data.costThisMonth / dayOfMonth) * daysInMonth : 0;
    const projectedChars = dayOfMonth > 0 ? (data.charsThisMonth / dayOfMonth) * daysInMonth : 0;

    // DeepL free tier limits
    const FREE_TIER_LIMIT = 500_000;
    const WARNING_THRESHOLD = 400_000; // 80%
    const CRITICAL_THRESHOLD = 475_000; // 95%

    // Sort language pairs by most used
    const sortedPairs = [...data.topLanguagePairs].sort((a, b) => b.chars - a.chars);
    const totalPairChars = sortedPairs.reduce((sum, p) => sum + p.chars, 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
                        Translation API Usage
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        DeepL translation consumption, caching and cost tracking.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {isPending ? 'Refreshing\u2026' : `Last: ${lastUpdated}`}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        {isPending ? '\u23F3' : '\uD83D\uDD04'} Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    label="Characters Today"
                    value={formatNumber(data.charsToday)}
                    subtext="Translated characters"
                />
                <SummaryCard
                    label="Characters This Month"
                    value={formatNumber(data.charsThisMonth)}
                    subtext={`of ${formatNumber(FREE_TIER_LIMIT)} free tier`}
                />
                <SummaryCard
                    label="Cost This Month"
                    value={formatCost(data.costThisMonth)}
                    subtext={`Projected: ${formatCost(projectedCost)}`}
                />
                <SummaryCard
                    label="Cache Hit Rate"
                    value={`${data.cacheHitRate}%`}
                    subtext="Translation cache (month)"
                    badge={<CacheHitRateBadge rate={data.cacheHitRate} />}
                />
            </div>

            {/* DeepL API Limit Warning */}
            {data.charsThisMonth > WARNING_THRESHOLD && (
                <div
                    className={`rounded-xl border px-4 py-3 ${
                        data.charsThisMonth > CRITICAL_THRESHOLD
                            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                            : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                    }`}
                >
                    <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">
                            {data.charsThisMonth > CRITICAL_THRESHOLD ? '\u26A0\uFE0F' : '\u26A0\uFE0F'}
                        </span>
                        <div>
                            <p
                                className={`text-sm font-semibold ${
                                    data.charsThisMonth > CRITICAL_THRESHOLD
                                        ? 'text-red-800 dark:text-red-300'
                                        : 'text-amber-800 dark:text-amber-300'
                                }`}
                            >
                                {data.charsThisMonth > CRITICAL_THRESHOLD
                                    ? 'Critical: Approaching DeepL free tier limit'
                                    : 'Warning: High DeepL API usage'}
                            </p>
                            <p
                                className={`text-xs mt-0.5 ${
                                    data.charsThisMonth > CRITICAL_THRESHOLD
                                        ? 'text-red-700 dark:text-red-300'
                                        : 'text-amber-700 dark:text-amber-400'
                                }`}
                            >
                                {formatNumber(data.charsThisMonth)} of {formatNumber(FREE_TIER_LIMIT)} characters used (
                                {((data.charsThisMonth / FREE_TIER_LIMIT) * 100).toFixed(1)}%).
                                {data.charsThisMonth > CRITICAL_THRESHOLD
                                    ? ' Consider pausing non-essential translations or upgrading your plan.'
                                    : ' Monitor usage closely to avoid exceeding the free tier.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Section */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 py-2.5 px-4">
                    <h3 className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Cache &amp; Cost Details
                    </h3>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Cache Hits */}
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Cache Hits
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.cacheTotalHits)}
                        </span>
                    </div>
                    {/* Cache Misses */}
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Cache Misses
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.cacheTotalMisses)}
                        </span>
                    </div>
                    {/* Projected Monthly Cost */}
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Projected Monthly Cost
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatCost(projectedCost)}
                        </span>
                    </div>
                    {/* Projected Monthly Characters */}
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Projected Monthly Chars
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(Math.round(projectedChars))}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Daily Budget + Kill-Switch ─────────────────────────── */}
            <BudgetPanel budget={data.budgetConfig} />

            {/* ─── Per-Tier Cache Health ───────────────────────────────── */}
            {/* Surfaces memoryHits / postgresHits / apiCalls that the
                /api/translate route emits (Revision Round 1). These are
                process-local counters — they reset on deploy. For cross-
                instance aggregation we still rely on TranslationUsage. */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                <div className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 py-2.5 px-4">
                    <h3 className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                        Cache Health by Tier (process-local)
                    </h3>
                    <p className="mt-1 text-[10px] text-gray-400 dark:text-neutral-500 normal-case tracking-normal">
                        Current instance, since process start. On horizontally-scaled deploys
                        each replica reports its own counters — for aggregate hit rate use
                        TranslationUsage totals above.
                    </p>
                </div>
                <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Tier 1 (In-Memory)
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.tierCacheStats.memoryHits)}
                            <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">
                                {data.tierCacheStats.memoryHitRate.toFixed(1)}%
                            </span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                            {data.tierCacheStats.memorySize}/{data.tierCacheStats.memoryCapacity} entries
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Tier 2 (Postgres)
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.tierCacheStats.postgresHits)}
                            <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">
                                {data.tierCacheStats.postgresHitRate.toFixed(1)}%
                            </span>
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                            {formatNumber(data.tierCacheStats.postgresCount)} stored rows
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Tier 3 (DeepL calls)
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.tierCacheStats.misses)}
                            <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">
                                {data.tierCacheStats.missRate.toFixed(1)}%
                            </span>
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-400 dark:text-neutral-500">
                            Total Lookups
                        </span>
                        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                            {formatNumber(data.tierCacheStats.total)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── DB-Backed Cache Health (aggregate, all replicas) ──────── */}
            {data.dbTierStats.total > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 py-2.5 px-4">
                        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            Cache Health by Tier (aggregate, this month)
                        </h3>
                        <p className="mt-1 text-[10px] text-gray-400 dark:text-neutral-500 normal-case tracking-normal">
                            Persisted per-request via <code className="bg-gray-100 dark:bg-neutral-700 px-1 rounded">cacheTier</code> column.
                            Reflects all replicas.
                        </p>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 dark:text-neutral-500">Tier 1 (LRU)</span>
                            <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                                {formatNumber(data.dbTierStats.lruHits)}
                                <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">{data.dbTierStats.lruHitRate}%</span>
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                                {formatNumber(data.dbTierStats.lruChars)} chars
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 dark:text-neutral-500">Tier 2 (Postgres)</span>
                            <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                                {formatNumber(data.dbTierStats.dbHits)}
                                <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">{data.dbTierStats.dbHitRate}%</span>
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                                {formatNumber(data.dbTierStats.dbChars)} chars
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 dark:text-neutral-500">Tier 3 (DeepL)</span>
                            <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                                {formatNumber(data.dbTierStats.misses)}
                                <span className="text-xs text-gray-400 dark:text-neutral-500 ml-2">{data.dbTierStats.missRate}%</span>
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                                {formatNumber(data.dbTierStats.missChars)} chars
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-400 dark:text-neutral-500">Total (this month)</span>
                            <span className="text-sm font-mono font-semibold text-gray-700 dark:text-neutral-200 mt-0.5">
                                {formatNumber(data.dbTierStats.total)}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Top Uncached Phrases ─────────────────────────────────── */}
            {data.topUncached.length > 0 && (
                <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                    <div className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 py-2.5 px-4">
                        <h3 className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            Top Uncached Phrases (pre-translation candidates)
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50/60 dark:bg-neutral-800/60">
                                    <th className="py-2 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Phrase</th>
                                    <th className="py-2 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">Misses</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.topUncached.slice(0, 10).map((row) => (
                                    <tr key={row.phrase} className="border-b border-gray-100 dark:border-neutral-700/60">
                                        <td className="py-2 px-4 text-xs font-mono text-gray-700 dark:text-neutral-200 truncate max-w-md">{row.phrase}</td>
                                        <td className="py-2 px-4 text-xs font-mono text-right text-gray-700 dark:text-neutral-200">{row.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Top Language Pairs Table */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                                    Language Pair
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    Characters
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    % of Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPairs.map((pair) => (
                                <tr
                                    key={pair.pair}
                                    className="border-b border-gray-100 dark:border-neutral-700/60 transition-colors"
                                >
                                    <td className="py-3 px-4">
                                        <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                                            {pair.pair}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-neutral-200">
                                        {formatNumber(pair.chars)}
                                    </td>
                                    <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-neutral-200">
                                        {totalPairChars > 0
                                            ? `${((pair.chars / totalPairChars) * 100).toFixed(1)}%`
                                            : '\u2014'}
                                    </td>
                                </tr>
                            ))}
                            {sortedPairs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={3}
                                        className="py-6 px-4 text-center text-sm text-gray-400 dark:text-neutral-500"
                                    >
                                        No language pair data available yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table footer */}
                <div className="border-t border-gray-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-800/60">
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {sortedPairs.length} language pair{sortedPairs.length !== 1 ? 's' : ''} tracked
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500 dark:text-neutral-400">
                            Total: <span className="font-semibold text-gray-900 dark:text-neutral-100">{formatNumber(totalPairChars)}</span> chars
                        </span>
                        <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isPending ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                            <span className="text-gray-400 dark:text-neutral-500">
                                {isPending ? 'Updating' : 'Live'}
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Info note */}
            <p className="text-[11px] text-gray-400 dark:text-neutral-500 text-center">
                Cost estimates are based on DeepL API pricing. Character counts include cached translations. Auto-refreshes every 30 seconds.
            </p>
        </div>
    );
}

// ─── Budget Panel ─────────────────────────────────────────────────────────

function BudgetPanel({ budget }: { budget: TranslationUsageData['budgetConfig'] }) {
    const [isPending, startTransition] = useTransition();
    const [editBudget, setEditBudget] = useState<string>(String(budget.dailyCharBudget));
    const usagePercent = budget.dailyCharBudget > 0
        ? Math.min(100, Math.round((budget.todayUsed / budget.dailyCharBudget) * 100))
        : 0;

    const barColor = budget.killSwitchActive
        ? 'bg-red-500'
        : usagePercent >= 90
            ? 'bg-amber-500'
            : 'bg-emerald-500';

    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
            <div className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 py-2.5 px-4">
                <h3 className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                    Daily Budget + Kill-Switch
                </h3>
            </div>

            {budget.killSwitchActive && (
                <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                        Translation kill-switch active
                        {budget.killSwitchActivatedAt && (
                            <span className="font-normal text-red-500 dark:text-red-500 ml-1">
                                since {new Date(budget.killSwitchActivatedAt).toLocaleString()}
                            </span>
                        )}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                        New translations return cached results only. Click below to deactivate.
                    </p>
                </div>
            )}

            <div className="p-4 space-y-4">
                {/* Progress bar */}
                <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-neutral-400 mb-1.5">
                        <span>Today: {formatNumber(budget.todayUsed)} chars</span>
                        <span>Budget: {formatNumber(budget.dailyCharBudget)} chars</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${usagePercent}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-neutral-500 mt-1">
                        {usagePercent}% of daily budget used
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-end gap-3">
                    <div className="flex-1">
                        <label className="text-[10px] font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                            Daily char budget
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={10000}
                            value={editBudget}
                            onChange={(e) => setEditBudget(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 px-3 py-1.5 text-sm font-mono text-gray-900 dark:text-neutral-100"
                        />
                    </div>
                    <button
                        disabled={isPending || Number(editBudget) === budget.dailyCharBudget}
                        onClick={() => {
                            const val = Number(editBudget);
                            if (val >= 0 && Number.isFinite(val)) {
                                startTransition(() => setDailyBudget(val));
                            }
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-200 dark:hover:bg-neutral-600 disabled:opacity-50 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        disabled={isPending}
                        onClick={() => {
                            startTransition(() => toggleKillSwitch(!budget.killSwitchActive));
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            budget.killSwitchActive
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                        } disabled:opacity-50`}
                    >
                        {budget.killSwitchActive ? 'Deactivate Kill-Switch' : 'Activate Kill-Switch'}
                    </button>
                </div>
            </div>
        </div>
    );
}
