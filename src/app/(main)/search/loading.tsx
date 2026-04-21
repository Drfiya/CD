export default function SearchLoading() {
    return (
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-4">
            {/* Title */}
            <div className="h-8 w-24 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />

            {/* Filter tabs */}
            <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                ))}
            </div>

            {/* Result cards */}
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-3/4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
                                <div className="h-3 w-full bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                                <div className="h-3 w-2/3 bg-gray-100 dark:bg-neutral-700/50 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
