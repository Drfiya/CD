import { Metadata } from 'next';
import { getCourse } from '@/lib/course-actions';
import { CourseForm } from '@/components/admin/course-form';

interface PageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId } = await params;
  const course = await getCourse(courseId);

  if (!course) {
    return { title: 'Course Not Found | Admin' };
  }

  return { title: `${course.title} Settings | Admin` };
}

export default async function CourseSettingsPage({ params }: PageProps) {
  const { courseId } = await params;
  const course = await getCourse(courseId);

  if (!course) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Course Not Found</h1>
        <p className="mt-2 text-gray-600 dark:text-neutral-400">The course you are looking for does not exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Course Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-neutral-400">
          Update course details, description, and publish status.
        </p>
      </div>

      {/* Course edit form */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6">
        <CourseForm course={course} />
      </div>

      {/* Course stats */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Course Statistics</h2>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500 dark:text-neutral-400">Modules</dt>
            <dd className="text-2xl font-semibold">{course.modules.length}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-neutral-400">Created</dt>
            <dd className="text-sm font-medium">
              {new Date(course.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500 dark:text-neutral-400">Last Updated</dt>
            <dd className="text-sm font-medium">
              {new Date(course.updatedAt).toLocaleDateString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Status</dt>
            <dd>
              <span
                className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${course.status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                  }`}
              >
                {course.status === 'PUBLISHED' ? 'Published' : 'Draft'}
              </span>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
