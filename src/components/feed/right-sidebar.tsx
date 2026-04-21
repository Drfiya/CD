import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Avatar } from '@/components/ui/avatar';
import { AiToolsSidebar } from '@/components/feed/ai-tools-sidebar';
import { GamificationProgress } from '@/components/gamification/gamification-progress';
import { ProfileCompleteNudge } from '@/components/profile/profile-complete-nudge';
import { getCachedTopUsers, getCachedAiTools, getCachedMemberCount } from '@/lib/cached-queries';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';
import db from '@/lib/db';

export async function RightSidebar() {
    const [memberCount, topUsers, aiTools, userLanguage, session] = await Promise.all([
        getCachedMemberCount(),
        getCachedTopUsers(3),
        getCachedAiTools(),
        getUserLanguage(),
        getServerSession(authOptions),
    ]);

    // Fetch current user's gamification data for progress widget
    const currentUser = session?.user?.id
        ? await db.user.findUnique({
              where: { id: session.user.id },
              select: {
                  points: true,
                  level: true,
                  name: true,
                  bio: true,
                  image: true,
                  currentStreak: true,
                  longestStreak: true,
                  badges: { select: { type: true, customDefinitionId: true }, orderBy: { earnedAt: 'asc' } },
              },
          })
        : null;

    const messages = getMessages(userLanguage);
    const sidebar = messages.sidebar;
    const nav = messages.nav;
    const gamification = messages.gamification;
    const profileNudge = messages.profileNudge;

    return (
        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 gap-4">
            {/* Profile-completion nudge — hidden when name + bio + avatar all set */}
            {currentUser && (
                <ProfileCompleteNudge
                    user={{ name: currentUser.name, bio: currentUser.bio, image: currentUser.image }}
                    labels={profileNudge}
                />
            )}

            {/* Progress to next level — logged-in users only */}
            {currentUser && (
                <GamificationProgress
                    points={currentUser.points}
                    level={currentUser.level}
                    name={currentUser.name}
                    badges={currentUser.badges}
                    currentStreak={currentUser.currentStreak}
                    longestStreak={currentUser.longestStreak}
                    streakPromptLabel={gamification.streakPrompt}
                    streakDayLabel={gamification.streakDayLabel}
                    streakBestLabel={gamification.streakBestLabel}
                />
            )}

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
                        <div className="text-sm text-gray-500 dark:text-neutral-400">{sidebar.members}</div>
                    </div>
                </div>
            </div>

            {/* Leaderboard preview — Top 3 */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-700">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500 dark:text-neutral-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.748 0" />
                        </svg>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{sidebar.leaderboard}</h3>
                    </div>
                    <Link href="/leaderboard" className="text-sm font-medium hover:underline" style={{ color: '#D94A4A' }}>
                        {sidebar.viewAll}
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
                                <div className="text-xs text-gray-500 dark:text-neutral-400">{gamification.level} {user.level}</div>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{user.points}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* AI Tools */}
            <AiToolsSidebar title={nav.aiTools} viewAllLabel={sidebar.viewAll} tools={aiTools} />
        </aside>
    );
}
