/**
 * Instant loading skeleton for the Classroom page.
 * Next.js streams this immediately while the server component resolves data.
 */
export default function ClassroomLoading() {
    return (
        <div className="flex gap-6 max-w-7xl mx-auto">
            {/* Left sidebar skeleton */}
            <aside className="hidden lg:block w-64 shrink-0 space-y-4">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
                    <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-8 bg-gray-100 dark:bg-neutral-700/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Center - Main content skeleton */}
            <div className="flex-1 min-w-0 space-y-6">
                {/* Header banner */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-6 w-32 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                            <div className="h-3.5 w-56 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Course grid skeleton */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-5 w-5 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                        <div className="h-5 w-32 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden"
                            >
                                <div className="h-40 bg-gray-200 dark:bg-neutral-700 animate-pulse" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                    <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right sidebar skeleton */}
            <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 gap-4">
                {/* Stats */}
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-28 bg-gray-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
                                <div className="h-7 w-8 mx-auto bg-gray-200 dark:bg-neutral-600 rounded animate-pulse mb-1" />
                                <div className="h-3 w-14 mx-auto bg-gray-100 dark:bg-neutral-600/50 rounded animate-pulse" />
                            </div>
                        ))}
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
