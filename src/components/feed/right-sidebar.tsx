import Link from 'next/link';
import db from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';

interface TranslatedUI {
    members: string;
    leaderboard: string;
    viewAll: string;
    level: string;
}

interface RightSidebarProps {
    translatedUI: TranslatedUI;
}

export async function RightSidebar({ translatedUI }: RightSidebarProps) {
    // Fetch member count and top leaderboard users
    const [memberCount, topUsers] = await Promise.all([
        db.user.count(),
        db.user.findMany({
            take: 5,
            orderBy: { points: 'desc' },
            select: { id: true, name: true, image: true, points: true, level: true },
        }),
    ]);

    return (
        <aside className="hidden lg:block w-72 shrink-0 space-y-4">
            {/* Members count */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-neutral-700 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600 dark:text-neutral-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{memberCount}</div>
                        <div className="text-sm text-gray-500 dark:text-neutral-400">{translatedUI.members}</div>
                    </div>
                </div>
            </div>

            {/* Leaderboard preview */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-neutral-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.748 0" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{translatedUI.leaderboard}</h3>
                    </div>
                    <Link href="/leaderboard" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        {translatedUI.viewAll}
                    </Link>
                </div>

                <div className="space-y-3">
                    {topUsers.map((user, index) => (
                        <Link
                            key={user.id}
                            href={`/members/${user.id}`}
                            className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-neutral-700 rounded-lg p-1 -mx-1 transition-colors"
                        >
                            <span className="w-5 text-sm font-medium text-gray-400">{index + 1}</span>
                            <Avatar src={user.image} name={user.name} size="sm" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">{user.name}</div>
                                <div className="text-xs text-gray-500 dark:text-neutral-400">{translatedUI.level} {user.level}</div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{user.points}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </aside>
    );
}
