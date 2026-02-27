'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface ClassroomSidebarUI {
    allCourses: string;
    myCourses: string;
    availableCourses: string;
    categoriesTitle: string;
}

interface ClassroomLeftSidebarProps {
    ui: ClassroomSidebarUI;
    activeFilter: string | null;
    isLoggedIn: boolean;
    sidebarBannerImage?: string | null;
    sidebarBannerUrl?: string | null;
    sidebarBannerEnabled?: boolean;
}

export function ClassroomLeftSidebar({
    ui,
    activeFilter,
    isLoggedIn,
    sidebarBannerImage,
    sidebarBannerUrl,
    sidebarBannerEnabled,
}: ClassroomLeftSidebarProps) {
    const searchParams = useSearchParams();

    const buildFilterUrl = (filter: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (filter) {
            params.set('filter', filter);
        } else {
            params.delete('filter');
        }
        return `/classroom?${params.toString()}`;
    };

    const showBanner = sidebarBannerEnabled && sidebarBannerImage;

    const filters = [
        { key: null, label: ui.allCourses, icon: '📚' },
        ...(isLoggedIn
            ? [
                { key: 'enrolled', label: ui.myCourses, icon: '🎓' },
                { key: 'available', label: ui.availableCourses, icon: '🆕' },
            ]
            : []),
    ];

    return (
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                    {ui.categoriesTitle}
                </h2>

                <nav className="space-y-1">
                    {filters.map((filter) => (
                        <Link
                            key={filter.key ?? 'all'}
                            href={buildFilterUrl(filter.key)}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeFilter === filter.key
                                    ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                                    : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                                }
              `}
                        >
                            <span className="text-base">{filter.icon}</span>
                            <span>{filter.label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            {/* Sidebar Banner */}
            {showBanner && (
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-neutral-700">
                    {sidebarBannerUrl ? (
                        <a href={sidebarBannerUrl} className="block">
                            <img
                                src={sidebarBannerImage}
                                alt="Banner"
                                className="w-full aspect-[9/16] object-cover"
                            />
                        </a>
                    ) : (
                        <img
                            src={sidebarBannerImage}
                            alt="Banner"
                            className="w-full aspect-[9/16] object-cover"
                        />
                    )}
                </div>
            )}
        </aside>
    );
}
