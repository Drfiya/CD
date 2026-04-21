export default function MembersLoading() {
    return (
        <div className="flex gap-6">
            {/* Left sidebar skeleton */}
            <aside className="hidden lg:block w-56 shrink-0">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-20 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mb-4" />
                    <div className="space-y-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-8 bg-gray-100 dark:bg-neutral-700/50 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </aside>

            {/* Member grid skeleton */}
            <div className="flex-1 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, i) => (
                        <div
                            key={i}
                            className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-28 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                    <div className="h-3 w-20 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="mt-4 flex gap-4">
                                <div className="h-3 w-16 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                <div className="h-3 w-16 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right sidebar skeleton */}
            <aside className="hidden xl:block w-64 shrink-0">
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mb-4" />
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                        ))}
                    </div>
                </div>
            </aside>
        </div>
    );
}
