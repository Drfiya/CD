export default function CalendarLoading() {
    return (
        <div className="space-y-4">
            {/* Month navigation header */}
            <div className="flex items-center justify-between">
                <div className="h-7 w-40 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                <div className="flex items-center gap-2">
                    <div className="h-9 w-20 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="h-9 w-24 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                </div>
            </div>

            {/* Calendar grid */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 overflow-hidden">
                {/* Day labels */}
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-neutral-700">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <div key={d} className="py-2 text-center">
                            <div className="h-4 w-6 mx-auto bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
                {/* Calendar rows */}
                {[0, 1, 2, 3, 4].map((row) => (
                    <div key={row} className="grid grid-cols-7 border-b border-gray-100 dark:border-neutral-700 last:border-0">
                        {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                            <div key={col} className="min-h-[80px] p-2 border-r border-gray-100 dark:border-neutral-700 last:border-0">
                                <div className="h-5 w-5 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse mb-1" />
                                {(row + col) % 5 === 0 && (
                                    <div className="h-5 w-full bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* Upcoming events list */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="h-5 w-36 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-neutral-700 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                <div className="h-3 w-1/2 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
