import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getCourseWithLessons } from '@/lib/course-actions';
import { getEnrollment } from '@/lib/enrollment-actions';
import { getNextIncompleteLesson } from '@/lib/progress-actions';
import { EnrollButton } from '@/components/classroom/enroll-button';
import { getUserLanguage } from '@/lib/translation/helpers';
import { getMessages } from '@/lib/i18n';
import { UGCText } from '@/components/translation/UGCText';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export default async function CourseOverviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const { courseId } = await params;

  const course = await getCourseWithLessons(courseId);

  // Layout handles null/unpublished check, but TypeScript needs this
  if (!course) {
    return null;
  }

  const enrollment = session?.user?.id
    ? await getEnrollment(session.user.id, courseId)
    : null;
  const isEnrolled = !!enrollment;

  // Count published lessons
  const publishedLessonCount = course.modules.reduce((acc, module) => {
    return (
      acc + module.lessons.filter((lesson) => lesson.status === 'PUBLISHED').length
    );
  }, 0);

  // Get next incomplete lesson for enrolled users
  const nextLesson =
    isEnrolled && session?.user?.id
      ? await getNextIncompleteLesson(session.user.id, courseId)
      : null;

  // Get first published lesson for continue button
  const firstLessonId = course.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.status === 'PUBLISHED')?.id;

  // Fail-open language resolution — course detail should never white-screen
  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch (err) {
    console.error('[CourseDetail] getUserLanguage failed, defaulting to en:', err);
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);
  const cp = messages.classroomPage;

  return (
    <div className="max-w-3xl space-y-8">
      {/* Course header */}
      <div>
        <h1 className="text-3xl font-bold">
          <UGCText as="span">{course.title}</UGCText>
        </h1>
        <p className="text-muted-foreground mt-2">
          {publishedLessonCount} {publishedLessonCount === 1 ? cp.lesson : cp.lessons}
        </p>
      </div>

      {/* Enrollment CTA */}
      <div className="flex items-center gap-4">
        <EnrollButton courseId={courseId} isEnrolled={isEnrolled} />

        {isEnrolled && (
          <Link
            href={
              nextLesson
                ? `/classroom/courses/${courseId}/lessons/${nextLesson.lessonId}`
                : firstLessonId
                ? `/classroom/courses/${courseId}/lessons/${firstLessonId}`
                : '#'
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {nextLesson ? cp.continueLearning : cp.startCourse}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        )}
      </div>

      {/* Course description */}
      {course.description && (
        <div className="prose prose-gray max-w-none">
          <UGCText as="p">{course.description}</UGCText>
        </div>
      )}

      {/* What you'll learn (for non-enrolled users) */}
      {!isEnrolled && (
        <div className="bg-gray-50 border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">{cp.courseContent}</h2>
          <p className="text-muted-foreground mb-4">
            {cp.enrollToAccessLessons}
          </p>
          <ul className="space-y-2">
            {course.modules.map((module) => {
              const publishedLessons = module.lessons.filter(
                (l) => l.status === 'PUBLISHED'
              );
              if (publishedLessons.length === 0) return null;

              return (
                <li key={module.id} className="flex items-start gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 0 0-1.883 2.542l.857 6a2.25 2.25 0 0 0 2.227 1.932H19.05a2.25 2.25 0 0 0 2.227-1.932l.857-6a2.25 2.25 0 0 0-1.883-2.542m-16.5 0V6A2.25 2.25 0 0 1 6 3.75h3.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 0 1.06.44H18A2.25 2.25 0 0 1 20.25 9v.776"
                    />
                  </svg>
                  <div>
                    <UGCText as="span" className="font-medium">{module.title}</UGCText>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({publishedLessons.length}{' '}
                      {publishedLessons.length === 1 ? cp.lesson : cp.lessons})
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
