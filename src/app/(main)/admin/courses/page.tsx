import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getCourses } from '@/lib/course-actions';
import { CourseCard } from '@/components/admin/course-card';
import { CourseForm } from '@/components/admin/course-form';
import { EmptyState } from '@/components/ui/empty-state';

export const metadata: Metadata = {
  title: 'Course Management | Admin',
};

export default async function AdminCoursesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/moderation');
  }

  const courses = await getCourses();

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Course Management</h1>
        <p className="text-muted-foreground mt-1">
          Create and manage classroom courses
        </p>
      </div>

      {/* Course creation form */}
      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-medium mb-4">Create Course</h2>
        <CourseForm />
      </div>

      {/* Course list */}
      <div>
        <h2 className="text-lg font-medium mb-4">Courses</h2>
        {courses.length === 0 ? (
          <EmptyState
            title="No courses yet"
            description="Create your first course to get started with the classroom."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
