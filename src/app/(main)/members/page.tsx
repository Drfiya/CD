import { Suspense } from 'react';
import db from '@/lib/db';
import { MemberGrid } from '@/components/profile/member-grid';
import { MembersLeftSidebar } from '@/components/profile/members-left-sidebar';
import { ClassroomRightSidebar } from '@/components/classroom/classroom-right-sidebar';
import { Pagination } from '@/components/ui/pagination';
import { tMany } from '@/lib/translation/helpers';
import { getCommunitySettings } from '@/lib/settings-actions';

const ITEMS_PER_PAGE = 12;

interface MembersPageProps {
  searchParams: Promise<{ page?: string; level?: string }>;
}

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const params = await searchParams;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const levelFilter = params.level ? parseInt(params.level, 10) : null;
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Build where clause
  const where = levelFilter ? { level: levelFilter } : {};

  const [members, total, maxLevelResult, communitySettings] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: ITEMS_PER_PAGE,
      orderBy: { points: 'desc' },
      select: {
        id: true,
        name: true,
        image: true,
        bio: true,
        level: true,
        points: true,
      },
    }),
    db.user.count({ where }),
    db.user.aggregate({ _max: { level: true } }),
    getCommunitySettings(),
  ]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const maxLevel = maxLevelResult._max.level || 1;

  // Translate UI text
  const uiRaw = await tMany({
    title: 'Members',
    member: 'member',
    members: 'members',
    inTheCommunity: 'in the community',
    searchPlaceholder: 'Search members...',
    filtersTitle: 'Filters',
    allMembers: 'All Members',
    levelPrefix: 'Level',
    topLearners: 'Top Members',
    viewAll: 'View all',
    level: 'Level',
    learningProgress: 'Community Stats',
    coursesEnrolled: 'Members',
    coursesCompleted: 'Completed',
    lessonsCompleted: 'Courses',
  }, 'members');

  const ui = uiRaw as Record<string, string>;
  const memberLabel = total === 1 ? ui.member : ui.members;

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      {/* Left Sidebar - Filters */}
      <MembersLeftSidebar
        ui={{
          filtersTitle: ui.filtersTitle,
          allMembers: ui.allMembers,
          levelPrefix: ui.levelPrefix,
        }}
        activeLevel={levelFilter}
        maxLevel={maxLevel}
        sidebarBannerImage={communitySettings.sidebarBannerImage}
        sidebarBannerUrl={communitySettings.sidebarBannerUrl}
        sidebarBannerEnabled={communitySettings.sidebarBannerEnabled}
      />

      {/* Center - Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#D94A4A' }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{ui.title}</h1>
              <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">
                {total} {memberLabel} {ui.inTheCommunity}
              </p>
            </div>
          </div>
        </div>

        {/* Member Grid with Search */}
        <MemberGrid
          members={members}
          searchPlaceholder={ui.searchPlaceholder}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        )}
      </div>

      {/* Right Sidebar - Leaderboard */}
      <Suspense fallback={
        <aside className="hidden lg:block w-72 shrink-0">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-48" />
        </aside>
      }>
        <ClassroomRightSidebar
          translatedUI={{
            learningProgress: ui.learningProgress,
            topLearners: ui.topLearners,
            viewAll: ui.viewAll,
            level: ui.level,
            coursesEnrolled: ui.coursesEnrolled,
            coursesCompleted: ui.coursesCompleted,
            lessonsCompleted: ui.lessonsCompleted,
          }}
          userId={null}
        />
      </Suspense>
    </div>
  );
}
