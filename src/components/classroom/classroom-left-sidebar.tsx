'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import { useTranslations } from '@/components/translation/TranslationContext';

interface ClassroomLeftSidebarProps {
    activeFilter: string | null;
    isLoggedIn: boolean;
    sidebarBannerImage?: string | null;
    sidebarBannerUrl?: string | null;
    sidebarBannerEnabled?: boolean;
}

// Heroicons outline SVGs (stroke-width 1.5)
const BookOpenIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
);

const AcademicCapIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
);

const PlusCircleIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

export function ClassroomLeftSidebar({
    activeFilter,
    isLoggedIn,
    sidebarBannerImage,
    sidebarBannerUrl,
    sidebarBannerEnabled,
}: ClassroomLeftSidebarProps) {
    const searchParams = useSearchParams();
    const cp = useTranslations('classroomPage');

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

    const filters: { key: string | null; label: string; icon: ReactNode }[] = [
        { key: null, label: cp.allCourses, icon: BookOpenIcon },
        ...(isLoggedIn
            ? [
                { key: 'enrolled', label: cp.myCourses, icon: AcademicCapIcon },
                { key: 'available', label: cp.availableCourses, icon: PlusCircleIcon },
            ]
            : []),
    ];

    return (
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                    {cp.coursesCategory}
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
                            {filter.icon}
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
