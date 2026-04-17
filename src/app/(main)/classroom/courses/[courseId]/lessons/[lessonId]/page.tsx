import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { getLesson } from '@/lib/lesson-actions';
import { getEnrollment } from '@/lib/enrollment-actions';
import { getCompletedLessonIds, getNextIncompleteLesson } from '@/lib/progress-actions';
import { MarkCompleteButton } from '@/components/classroom/mark-complete-button';
import { LessonContent } from '@/components/classroom/lesson-content';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import { parseVideoUrl } from '@/lib/video-utils';
import { getUserLanguage } from '@/lib/translation/helpers';
import { getMessages } from '@/lib/i18n';
import { UGCText } from '@/components/translation/UGCText';

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export default async function LessonPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { courseId, lessonId } = await params;

  // Verify user is enrolled
  const enrollment = await getEnrollment(session.user.id, courseId);

  if (!enrollment) {
    redirect(`/classroom/courses/${courseId}`);
  }

  // Fetch lesson with module and course info
  const lesson = await getLesson(lessonId);

  if (!lesson || lesson.status !== 'PUBLISHED') {
    notFound();
  }

  // Verify lesson belongs to the correct course
  if (lesson.module.courseId !== courseId) {
    notFound();
  }

  // Check if lesson is completed
  const completedIds = await getCompletedLessonIds(session.user.id, courseId);
  const isCompleted = completedIds.includes(lessonId);

  // Get next incomplete lesson for "Next Lesson" button
  const nextLesson = await getNextIncompleteLesson(session.user.id, courseId);

  // Parse video URL if present
  const videoEmbed = lesson.videoUrl ? parseVideoUrl(lesson.videoUrl) : null;

  const userLanguage = await getUserLanguage();
  const messages = getMessages(userLanguage);
  const cp = messages.classroomPage;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Lesson header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground mb-1">
            <UGCText as="span">{lesson.module.title}</UGCText>
          </p>
          <h1 className="text-2xl font-bold">
            <UGCText as="span">{lesson.title}</UGCText>
          </h1>
        </div>
        <MarkCompleteButton lessonId={lessonId} initialCompleted={isCompleted} />
      </div>

      {/* Video embed if present */}
      {videoEmbed && (
        <div className="rounded-lg overflow-hidden">
          <VideoEmbedPlayer embed={videoEmbed} />
        </div>
      )}

      {/* Lesson content */}
      <div className="bg-white rounded-lg border p-6">
        <LessonContent content={lesson.content as object} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Link
          href={`/classroom/courses/${courseId}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          {cp.backToCourse}
        </Link>

        {nextLesson && nextLesson.lessonId !== lessonId && (
          <Link
            href={`/classroom/courses/${courseId}/lessons/${nextLesson.lessonId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            {cp.nextLesson}
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
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        )}
      </div>
    </div>
  );
}
