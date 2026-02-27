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
  noCoursesAvailable: string;
  checkBackSoon: string;
  noEnrolledCourses: string;
  notEnrolledYet: string;
  allCourses: string;
  categoriesTitle: string;
  learningProgress: string;
  topLearners: string;
  viewAll: string;
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
    noCoursesAvailable: 'No courses available',
    checkBackSoon: 'Check back soon for new courses.',
    noEnrolledCourses: 'No enrolled courses',
    notEnrolledYet: "You haven't enrolled in any courses yet.",
    allCourses: 'All Courses',
    categoriesTitle: 'Courses',
    learningProgress: 'My Progress',
    topLearners: 'Top Learners',
    viewAll: 'View all',
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
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                  <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.337 49.948 49.948 0 0 0-9.902 3.912l-.003.002-.34.18a.75.75 0 0 1-.707 0A50.88 50.88 0 0 0 7.5 12.173v-.224a.36.36 0 0 1 .172-.311 54.615 54.615 0 0 1 4.653-2.52.75.75 0 0 0-.65-1.352 56.123 56.123 0 0 0-4.78 2.589 1.858 1.858 0 0 0-.859 1.228 49.803 49.803 0 0 0-4.634-1.527.75.75 0 0 1-.231-1.337A60.653 60.653 0 0 1 11.7 2.805Z" />
                  <path d="M13.06 15.473a48.45 48.45 0 0 1 7.666-3.282c.134 1.414.22 2.843.255 4.284a.75.75 0 0 1-.46.711 47.87 47.87 0 0 0-8.105 4.342.75.75 0 0 1-.832 0 47.87 47.87 0 0 0-8.104-4.342.75.75 0 0 1-.461-.71c.035-1.442.121-2.87.255-4.286a48.4 48.4 0 0 1 7.667 3.282 49.85 49.85 0 0 1 2.12-1.998Z" />
                  <path d="M6.303 14.105A63.292 63.292 0 0 1 5 15.862v2.354a.75.75 0 0 1-1.5 0v-2.354a65.329 65.329 0 0 0-1.455-1.95A1.5 1.5 0 0 1 3.757 11.5h.49a1.5 1.5 0 0 1 1.056 2.605Z" />
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
      <SectionHeader title={ui.availableCourses} icon="📖" />
      <CourseCatalogGrid
        courses={translatedCourses}
        ui={{
          lessons: ui.lessons,
          lesson: ui.lesson,
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
          <SectionHeader title={ui.myCourses} icon="🎓" />
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
          <SectionHeader title={ui.availableCourses} icon="📖" />
          <CourseCatalogGrid
            courses={activeFilter === 'available' ? availableCourses : availableCourses}
            ui={{
              lessons: ui.lessons,
              lesson: ui.lesson,
              noCoursesAvailable: ui.noCoursesAvailable,
              checkBackSoon: ui.checkBackSoon,
            }}
          />
        </section>
      )}
    </>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <h2 className="text-base font-semibold text-gray-900 dark:text-neutral-100">{title}</h2>
    </div>
  );
}
