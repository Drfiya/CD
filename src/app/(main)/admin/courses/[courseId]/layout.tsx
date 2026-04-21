import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getCourseWithLessons } from '@/lib/course-actions';
import { CourseTree } from '@/components/admin/course-tree';
import { ModuleForm } from '@/components/admin/module-form';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}

export default async function CourseLayout({ children, params }: LayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/posts');
  }

  const { courseId } = await params;
  const course = await getCourseWithLessons(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r bg-gray-50/50 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Back to courses link */}
          <Link
            href="/admin/courses"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Courses
          </Link>

          {/* Course title */}
          <div>
            <h2 className="font-semibold text-lg truncate" title={course.title}>
              {course.title}
            </h2>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${
                course.status === 'PUBLISHED'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {course.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </span>
          </div>

          {/* Course settings link */}
          <Link
            href={`/admin/courses/${courseId}`}
            className="block text-sm text-blue-600 hover:text-blue-800"
          >
            Course Settings
          </Link>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Content</h3>
            </div>

            {/* Course tree */}
            <CourseTree courseId={courseId} modules={course.modules} />

            {/* Add module form */}
            <div className="mt-4 pt-4 border-t">
              <AddModuleSection courseId={courseId} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

// Client component for add module toggle
function AddModuleSection({ courseId }: { courseId: string }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
        <svg
          className="w-4 h-4 transition-transform group-open:rotate-90"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Add Module
      </summary>
      <div className="mt-2">
        <ModuleForm courseId={courseId} />
      </div>
    </details>
  );
}
