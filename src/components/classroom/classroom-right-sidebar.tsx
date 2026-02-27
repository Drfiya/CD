import db from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';

interface ClassroomRightSidebarUI {
    learningProgress: string;
    topLearners: string;
    viewAll: string;
    level: string;
    coursesEnrolled: string;
    coursesCompleted: string;
    lessonsCompleted: string;
}

interface ClassroomRightSidebarProps {
    translatedUI: ClassroomRightSidebarUI;
    userId?: string | null;
}

export async function ClassroomRightSidebar({ translatedUI, userId }: ClassroomRightSidebarProps) {
    // Fetch top learners (users who completed the most lessons)
    const topLearners = await db.user.findMany({
        take: 5,
        orderBy: { points: 'desc' },
        select: { id: true, name: true, image: true, points: true, level: true },
    });

    // If logged in, get learning stats
    let stats = { enrolled: 0, completed: 0, lessonsCompleted: 0 };
    if (userId) {
        const [enrollmentCount, lessonProgressCount] = await Promise.all([
            db.enrollment.count({ where: { userId } }),
            db.lessonProgress.count({ where: { userId } }),
        ]);
        stats.enrolled = enrollmentCount;
        stats.lessonsCompleted = lessonProgressCount;
    }

    return (
        <aside className="hidden lg:block w-72 shrink-0 space-y-4">
            {/* Learning Stats (only for logged-in users) */}
            {userId && (
                <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-base">📊</span>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">
                            {translatedUI.learningProgress}
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{stats.enrolled}</div>
                            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{translatedUI.coursesEnrolled}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-neutral-700/50 rounded-lg p-3 text-center">
                            <div className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{stats.lessonsCompleted}</div>
                            <div className="text-xs text-gray-500 dark:text-neutral-400 mt-0.5">{translatedUI.lessonsCompleted}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Learners / Leaderboard */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-base">🏆</span>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{translatedUI.topLearners}</h3>
                    </div>
                    <Link href="/leaderboard" className="text-sm font-medium hover:underline" style={{ color: '#D94A4A' }}>
                        {translatedUI.viewAll}
                    </Link>
                </div>

                <div className="space-y-3">
                    {topLearners.map((user, index) => (
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
