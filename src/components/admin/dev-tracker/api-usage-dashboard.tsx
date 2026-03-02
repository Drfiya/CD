'use client';

/**
 * API Usage Dashboard
 *
 * Live dashboard showing API usage, costs, and status across all
 * configured services. Auto-refreshes every 30 seconds.
 */

import { useState, useEffect, useTransition } from 'react';
import type { ApiUsageData, ServiceUsage } from '@/lib/dev-tracker/api-usage-actions';
import { getApiUsageData } from '@/lib/dev-tracker/api-usage-actions';

// --- Format helpers ---

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
}

function formatCost(n: number): string {
    if (n === 0) return '—';
    if (n < 0.01) return '<$0.01';
    return `$${n.toFixed(2)}`;
}

function statusColor(status: ServiceUsage['status']): string {
    switch (status) {
        case 'active': return 'bg-emerald-500';
        case 'inactive': return 'bg-neutral-400';
        case 'error': return 'bg-red-500';
    }
}

function statusLabel(status: ServiceUsage['status']): string {
    switch (status) {
        case 'active': return 'Active';
        case 'inactive': return 'Inactive';
        case 'error': return 'Error';
    }
}

// --- Summary Card ---

function SummaryCard({
    label,
    value,
    subtext,
}: {
    label: string;
    value: string;
    subtext?: string;
}) {
    return (
        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                {label}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-neutral-100 mt-1">
                {value}
            </p>
            {subtext && (
                <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
                    {subtext}
                </p>
            )}
        </div>
    );
}

// --- Service Row ---

function ServiceRow({ service }: { service: ServiceUsage }) {
    const [expanded, setExpanded] = useState(false);
    const hasDetails = service.details && Object.keys(service.details).length > 0;

    return (
        <>
            <tr
                className={`border-b border-gray-100 dark:border-neutral-700/60 transition-colors ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700/30' : ''
                    }`}
                onClick={() => hasDetails && setExpanded(!expanded)}
            >
                {/* Service */}
                <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                        <span className="text-lg">{service.icon}</span>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                                {service.name}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-neutral-500">
                                {service.limit}
                            </p>
                        </div>
                    </div>
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusColor(service.status)}`} />
                        <span className="text-xs text-gray-600 dark:text-neutral-300">
                            {statusLabel(service.status)}
                        </span>
                    </div>
                </td>

                {/* Unit */}
                <td className="py-3 px-4 text-xs text-gray-500 dark:text-neutral-400">
                    {service.unit}
                </td>

                {/* Today */}
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-neutral-200">
                    {service.usageToday > 0 ? formatNumber(service.usageToday) : '—'}
                </td>

                {/* This Month */}
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-neutral-200">
                    {service.usageThisMonth > 0 ? formatNumber(service.usageThisMonth) : '—'}
                </td>

                {/* Cost Today */}
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-700 dark:text-neutral-200">
                    {formatCost(service.costToday)}
                </td>

                {/* Cost Month */}
                <td className="py-3 px-4 text-sm font-mono text-right font-semibold text-gray-900 dark:text-neutral-100">
                    {formatCost(service.costThisMonth)}
                </td>

                {/* Cache */}
                <td className="py-3 px-4 text-right">
                    {service.cacheHitRate !== undefined ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${service.cacheHitRate >= 80
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : service.cacheHitRate >= 50
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                            }`}>
                            {service.cacheHitRate}%
                        </span>
                    ) : (
                        <span className="text-xs text-gray-300 dark:text-neutral-600">—</span>
                    )}
                </td>

                {/* Expand */}
                <td className="py-3 px-2 text-center">
                    {hasDetails && (
                        <span className={`text-xs text-gray-400 transition-transform inline-block ${expanded ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    )}
                </td>
            </tr>

            {/* Expanded details */}
            {expanded && hasDetails && (
                <tr className="bg-gray-50/50 dark:bg-neutral-800/40">
                    <td colSpan={9} className="px-4 py-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
                            {Object.entries(service.details!).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                    <span className="text-gray-400 dark:text-neutral-500 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span className="text-gray-700 dark:text-neutral-200 font-mono mt-0.5">
                                        {typeof value === 'number' ? formatNumber(value) : value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// --- Main Component ---

interface ApiUsageDashboardProps {
    initialData: ApiUsageData;
}

export function ApiUsageDashboard({ initialData }: ApiUsageDashboardProps) {
    const [data, setData] = useState<ApiUsageData>(initialData);
    const [isPending, startTransition] = useTransition();

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => {
            startTransition(async () => {
                try {
                    const fresh = await getApiUsageData();
                    setData(fresh);
                } catch {
                    // Silently fail — keep stale data
                }
            });
        }, 30_000);

        return () => clearInterval(interval);
    }, []);

    const lastUpdated = new Date(data.lastUpdated).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    function handleRefresh() {
        startTransition(async () => {
            try {
                const fresh = await getApiUsageData();
                setData(fresh);
            } catch {
                // Silently fail
            }
        });
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
                        API Usage
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Live API costs and usage across all configured services.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {isPending ? 'Refreshing…' : `Last: ${lastUpdated}`}
                    </span>
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 hover:bg-gray-50 dark:hover:bg-neutral-600 transition-colors disabled:opacity-50"
                    >
                        {isPending ? '⏳' : '🔄'} Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <SummaryCard
                    label="Cost Today"
                    value={formatCost(data.totalCostToday)}
                    subtext="Across all services"
                />
                <SummaryCard
                    label="Cost This Month"
                    value={formatCost(data.totalCostThisMonth)}
                    subtext="Projected from usage"
                />
                <SummaryCard
                    label="API Calls Today"
                    value={formatNumber(data.totalRequestsToday)}
                    subtext="Excluding cached"
                />
                <SummaryCard
                    label="Cache Hit Rate"
                    value={`${data.overallCacheHitRate}%`}
                    subtext="Translation cache (month)"
                />
            </div>

            {/* Services Table */}
            <div className="rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800">
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                                    Service
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                                    Unit
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    Today
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    This Month
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    Cost Today
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    Cost Month
                                </th>
                                <th className="py-2.5 px-4 text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider text-right">
                                    Cache
                                </th>
                                <th className="py-2.5 px-2 w-8" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.services.map((service) => (
                                <ServiceRow key={service.name} service={service} />
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Table footer */}
                <div className="border-t border-gray-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-800/60">
                    <span className="text-xs text-gray-400 dark:text-neutral-500">
                        {data.services.filter(s => s.status === 'active').length} of {data.services.length} services active
                    </span>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500 dark:text-neutral-400">
                            Total: <span className="font-semibold text-gray-900 dark:text-neutral-100">{formatCost(data.totalCostThisMonth)}</span>/mo
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
                Cost estimates are approximations based on publicly listed pricing. Auto-refreshes every 30 seconds. Click a row to expand details.
            </p>
        </div>
    );
}
