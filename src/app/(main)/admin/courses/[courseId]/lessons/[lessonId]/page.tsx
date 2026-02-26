import { Metadata } from 'next';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getLesson } from '@/lib/lesson-actions';
import { Button } from '@/components/ui/button';
import { LessonEditForm } from './lesson-edit-form';

interface PageProps {
  params: Promise<{ courseId: string; lessonId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) {
    return { title: 'Lesson Not Found | Admin' };
  }

  return { title: `${lesson.title} | Admin` };
}

export default async function LessonEditPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (parent layout handles this, but double-check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/moderation');
  }

  const { courseId, lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) {
    notFound();
  }

  // Verify lesson belongs to the course via module
  if (lesson.module.courseId !== courseId) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/courses" className="hover:text-gray-900">
          Courses
        </Link>
        <span>/</span>
        <Link
          href={`/admin/courses/${lesson.module.course.id}`}
          className="hover:text-gray-900 truncate max-w-[150px]"
        >
          {lesson.module.course.title}
        </Link>
        <span>/</span>
        <span className="truncate max-w-[150px]">{lesson.module.title}</span>
        <span>/</span>
        <span className="text-gray-900 truncate max-w-[150px]">{lesson.title}</span>
      </nav>

      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/courses/${courseId}`}>&larr; Back to Course</Link>
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Edit Lesson</h1>
        <span
          className={`px-2 py-0.5 text-sm font-medium rounded ${
            lesson.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {lesson.status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Lesson edit form */}
      <LessonEditForm lesson={lesson} />
    </div>
  );
}
