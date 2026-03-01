import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getPublishedCourses,
  getEnrolledCoursesWithProgress,
} from '@/lib/enrollment-actions';
import {
  CourseCatalogGrid,
  EnrolledCoursesGrid,
} from '@/components/classroom/course-catalog-grid';
import type { EnrolledCourse } from '@/components/classroom/enrolled-course-card';
import { ClassroomLeftSidebar } from '@/components/classroom/classroom-left-sidebar';
import { ClassroomRightSidebar } from '@/components/classroom/classroom-right-sidebar';
import { tMany, getUserLanguage } from '@/lib/translation/helpers';
import { translateObjects } from '@/lib/translation/ui';
import { getCommunitySettings } from '@/lib/settings-actions';

interface ClassroomUI {
  title: string;
  subtitle: string;
  myCourses: string;
  availableCourses: string;
  signIn: string;
  signInPrompt: string;
  lessons: string;
  lesson: string;
  completed: string;
  continueLearning: string;
  startCourse: string;
  viewCourse: string;
  noCoursesAvailable: string;
  checkBackSoon: string;
  noEnrolledCourses: string;
  notEnrolledYet: string;
  allCourses: string;
  categoriesTitle: string;
  learningProgress: string;
  topLearners: string;
  viewAll: string;
  aiToolsTitle: string;
  level: string;
  coursesEnrolled: string;
  coursesCompleted: string;
  lessonsCompleted: string;
}

interface ClassroomPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function ClassroomPage({ searchParams }: ClassroomPageProps) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  const userLanguage = await getUserLanguage();

  // Translate all UI text dynamically via DeepL
  const uiRaw = await tMany({
    title: 'Classroom',
    subtitle: 'Browse courses and track your learning progress.',
    myCourses: 'My Courses',
    availableCourses: 'Available Courses',
    signIn: 'Sign in',
    signInPrompt: 'to enroll in courses and track your progress.',
    lessons: 'lessons',
    lesson: 'lesson',
    completed: 'Completed',
    continueLearning: 'Continue Learning',
    startCourse: 'Start Course',
    viewCourse: 'View Course →',
    noCoursesAvailable: 'No courses available',
    checkBackSoon: 'Check back soon for new courses.',
    noEnrolledCourses: 'No enrolled courses',
    notEnrolledYet: "You haven't enrolled in any courses yet.",
    allCourses: 'All Courses',
    categoriesTitle: 'Courses',
    learningProgress: 'My Progress',
    topLearners: 'Top Learners',
    viewAll: 'View all',
    aiToolsTitle: 'AI Tools',
    level: 'Level',
    coursesEnrolled: 'Enrolled',
    coursesCompleted: 'Completed',
    lessonsCompleted: 'Lessons',
  }, 'classroom');

  const ui: ClassroomUI = uiRaw as unknown as ClassroomUI;

  // Get community settings for sidebar banner
  const communitySettings = await getCommunitySettings();

  const activeFilter = params.filter || null;

  return (
    <Suspense fallback={
      <div className="flex gap-6 max-w-7xl mx-auto">
        <div className="w-64 shrink-0">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-48" />
        </div>
        <div className="flex-1">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-12 animate-pulse h-32 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-neutral-800 rounded-xl animate-pulse h-64" />
            <div className="bg-white dark:bg-neutral-800 rounded-xl animate-pulse h-64" />
          </div>
        </div>
        <div className="w-72 shrink-0 space-y-4">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-24" />
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-5 animate-pulse h-48" />
        </div>
      </div>
    }>
      <div className="flex gap-6 max-w-7xl mx-auto">
        {/* Left Sidebar - Course Filters */}
        <ClassroomLeftSidebar
          ui={{
            allCourses: ui.allCourses,
            myCourses: ui.myCourses,
            availableCourses: ui.availableCourses,
            categoriesTitle: ui.categoriesTitle,
          }}
          activeFilter={activeFilter}
          isLoggedIn={!!session?.user?.id}
          sidebarBannerImage={communitySettings.sidebarBannerImage}
          sidebarBannerUrl={communitySettings.sidebarBannerUrl}
          sidebarBannerEnabled={communitySettings.sidebarBannerEnabled}
        />

        {/* Center - Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#D94A4A' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="white" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{ui.title}</h1>
                <p className="text-sm text-gray-500 dark:text-neutral-400 mt-0.5">{ui.subtitle}</p>
              </div>
            </div>
          </div>

          {/* Sign-in prompt for non-logged-in users */}
          {!session?.user?.id && (
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-700 p-4">
              <p className="text-sm text-gray-500 dark:text-neutral-400">
                <a href="/login" className="font-semibold hover:underline" style={{ color: '#D94A4A' }}>
                  {ui.signIn}
                </a>{' '}
                {ui.signInPrompt}
              </p>
            </div>
          )}

          {session?.user?.id ? (
            <LoggedInContent
              userId={session.user.id}
              ui={ui}
              userLanguage={userLanguage}
              activeFilter={activeFilter}
            />
          ) : (
            <AllCoursesSection ui={ui} userLanguage={userLanguage} />
          )}
        </div>

        {/* Right Sidebar - Stats & Leaderboard */}
        <ClassroomRightSidebar
          translatedUI={{
            learningProgress: ui.learningProgress,
            topLearners: ui.topLearners,
            viewAll: ui.viewAll,
            aiToolsTitle: ui.aiToolsTitle,
            level: ui.level,
            coursesEnrolled: ui.coursesEnrolled,
            coursesCompleted: ui.coursesCompleted,
            lessonsCompleted: ui.lessonsCompleted,
          }}
          userId={session?.user?.id}
        />
      </div>
    </Suspense>
  );
}

async function AllCoursesSection({ ui, userLanguage }: { ui: ClassroomUI; userLanguage: string }) {
  const courses = await getPublishedCourses();

  // Translate course titles and descriptions
  const translatedCourses = await translateObjects(
    courses,
    ['title', 'description'],
    'en',
    userLanguage,
    'course'
  );

  return (
    <section className="space-y-4">
      <SectionHeader title={ui.availableCourses} icon={
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      } />
      <CourseCatalogGrid
        courses={translatedCourses}
        ui={{
          lessons: ui.lessons,
          lesson: ui.lesson,
          viewCourse: ui.viewCourse,
          noCoursesAvailable: ui.noCoursesAvailable,
          checkBackSoon: ui.checkBackSoon,
        }}
      />
    </section>
  );
}

async function LoggedInContent({
  userId,
  ui,
  userLanguage,
  activeFilter,
}: {
  userId: string;
  ui: ClassroomUI;
  userLanguage: string;
  activeFilter: string | null;
}) {
  // Fetch enrolled courses
  const enrolledRaw = await getEnrolledCoursesWithProgress(userId);
  const enrolledCourseIds = new Set(enrolledRaw.map((c) => c.courseId));

  // Map and translate enrolled courses
  const enrolledCoursesRaw: EnrolledCourse[] = enrolledRaw.map((course) => ({
    id: course.courseId,
    title: course.title,
    description: course.description,
    coverImage: course.coverImage,
    progressPercent: course.progressPercent,
    completedLessons: course.completedLessons,
    totalLessons: course.totalLessons,
    nextLessonId: course.nextLessonId,
  }));

  const enrolledCourses = await translateObjects(
    enrolledCoursesRaw,
    ['title', 'description'],
    'en',
    userLanguage,
    'course'
  );

  // Fetch and translate available courses
  const allCourses = await getPublishedCourses();
  const availableCoursesRaw = allCourses.filter(
    (course) => !enrolledCourseIds.has(course.id)
  );

  const availableCourses = await translateObjects(
    availableCoursesRaw,
    ['title', 'description'],
    'en',
    userLanguage,
    'course'
  );

  const showEnrolled = !activeFilter || activeFilter === 'enrolled';
  const showAvailable = !activeFilter || activeFilter === 'available';

  return (
    <>
      {showEnrolled && enrolledCourses.length > 0 && (
        <section className="space-y-4">
          <SectionHeader title={ui.myCourses} icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          } />
          <EnrolledCoursesGrid
            courses={enrolledCourses}
            ui={{
              lessons: ui.lessons,
              completed: ui.completed,
              continueLearning: ui.continueLearning,
              startCourse: ui.startCourse,
              noEnrolledCourses: ui.noEnrolledCourses,
              notEnrolledYet: ui.notEnrolledYet,
            }}
          />
        </section>
      )}

      {showEnrolled && enrolledCourses.length === 0 && activeFilter === 'enrolled' && (
        <section className="space-y-4">
          <SectionHeader title={ui.myCourses} icon="🎓" />
          <EnrolledCoursesGrid
            courses={[]}
            ui={{
              lessons: ui.lessons,
              completed: ui.completed,
              continueLearning: ui.continueLearning,
              startCourse: ui.startCourse,
              noEnrolledCourses: ui.noEnrolledCourses,
              notEnrolledYet: ui.notEnrolledYet,
            }}
          />
        </section>
      )}

      {showAvailable && (
        <section className="space-y-4">
          <SectionHeader title={ui.availableCourses} icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
          } />
          <CourseCatalogGrid
            courses={activeFilter === 'available' ? availableCourses : availableCourses}
            ui={{
              lessons: ui.lessons,
              lesson: ui.lesson,
              viewCourse: ui.viewCourse,
              noCoursesAvailable: ui.noCoursesAvailable,
              checkBackSoon: ui.checkBackSoon,
            }}
          />
        </section>
      )}
    </>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-gray-600 dark:text-neutral-400">
      {icon}
      <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{title}</h2>
    </div>
  );
}
