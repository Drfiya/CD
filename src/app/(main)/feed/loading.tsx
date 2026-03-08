/**
 * Instant loading skeleton for the Community feed page.
 * Next.js streams this immediately while the server component resolves data.
 */
export default function FeedLoading() {
    return (
        <div className="flex gap-6 max-w-7xl mx-auto">
            {/* Left sidebar skeleton */}
            <aside className="hidden lg:block w-64 shrink-0 space-y-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-8 bg-gray-100 dark:bg-neutral-700/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Center - Posts feed skeleton */}
            <div className="flex-1 min-w-0 space-y-4">
                {/* Create post bar */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                        <div className="flex-1 h-10 bg-gray-100 dark:bg-neutral-700/50 rounded-full animate-pulse" />
                    </div>
                </div>

                {/* Post skeletons */}
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden"
                    >
                        <div className="p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                                <div className="space-y-2">
                                    <div className="h-4 w-28 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                <div className="h-4 w-full bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                <div className="h-4 w-2/3 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-neutral-700 flex gap-6">
                            <div className="h-5 w-12 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                            <div className="h-5 w-12 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Right sidebar skeleton */}
            <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 gap-4">
                {/* Member count */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-6 w-12 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-5 h-4 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-3.5 w-20 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                    <div className="h-3 w-14 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}
