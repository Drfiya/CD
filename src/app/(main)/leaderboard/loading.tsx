export default function LeaderboardLoading() {
    return (
        <div className="max-w-2xl mx-auto space-y-4">
            {/* Title */}
            <div className="h-8 w-40 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />

            {/* Period tabs */}
            <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 w-28 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                ))}
            </div>

            {/* Your rank card */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-16 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Leaderboard rows */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 px-5 py-4 border-b border-gray-100 dark:border-neutral-700 last:border-0"
                    >
                        <div className="w-6 h-5 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse shrink-0" />
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                            <div className="h-3 w-20 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                        </div>
                        <div className="h-5 w-16 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
