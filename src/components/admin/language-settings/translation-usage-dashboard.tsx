'use client';

/**
 * Translation API Usage Dashboard
 *
 * Live dashboard showing DeepL translation API usage, cache performance,
 * and cost projections. Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useTransition } from 'react';
import type { TranslationUsageData } from '@/lib/language-settings/actions';
import { getTranslationUsageData } from '@/lib/language-settings/actions';

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
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';

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
                                        ? 'text-red-700 dark:text-red-400'
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
