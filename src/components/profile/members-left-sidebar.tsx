'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface MembersLeftSidebarUI {
    filtersTitle: string;
    allMembers: string;
    levelPrefix: string;
}

interface MembersLeftSidebarProps {
    ui: MembersLeftSidebarUI;
    activeLevel: number | null;
    maxLevel: number;
    sidebarBannerImage?: string | null;
    sidebarBannerUrl?: string | null;
    sidebarBannerEnabled?: boolean;
}

export function MembersLeftSidebar({
    ui,
    activeLevel,
    maxLevel,
    sidebarBannerImage,
    sidebarBannerUrl,
    sidebarBannerEnabled,
}: MembersLeftSidebarProps) {
    const searchParams = useSearchParams();

    const buildFilterUrl = (level: number | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (level !== null) {
            params.set('level', String(level));
        } else {
            params.delete('level');
        }
        params.delete('page');
        return `/members?${params.toString()}`;
    };

    const showBanner = sidebarBannerEnabled && sidebarBannerImage;

    const levels = Array.from({ length: maxLevel }, (_, i) => i + 1);

    return (
        <aside className="hidden lg:block w-64 shrink-0 space-y-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100 mb-4">
                    {ui.filtersTitle}
                </h2>

                <nav className="space-y-1">
                    <Link
                        href={buildFilterUrl(null)}
                        className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeLevel === null
                                ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                                : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                            }
            `}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        <span>{ui.allMembers}</span>
                    </Link>

                    {levels.map((level) => (
                        <Link
                            key={level}
                            href={buildFilterUrl(level)}
                            className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeLevel === level
                                    ? 'bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                                    : 'text-gray-600 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-700'
                                }
              `}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                            </svg>
                            <span>{ui.levelPrefix} {level}</span>
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
