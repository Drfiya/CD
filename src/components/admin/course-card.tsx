'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteCourse } from '@/lib/course-actions';
import type { CourseStatus } from '@/generated/prisma/client';

interface CourseCardProps {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: CourseStatus;
    _count: {
      modules: number;
    };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const result = await deleteCourse(course.id);

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete course');
        setIsConfirming(false);
        return;
      }

      setIsConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="border dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 hover:shadow-sm transition-shadow">
      {/* Header with status badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/admin/courses/${course.id}`}
          className="text-lg font-semibold hover:text-primary transition-colors"
        >
          {course.title}
        </Link>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${course.status === 'PUBLISHED'
              ? 'bg-green-100 text-green-800'
              : 'bg-yellow-100 text-yellow-800'
            }`}
        >
          {course.status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </span>
      </div>

      {/* Description preview */}
      {course.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {course.description}
        </p>
      )}

      {/* Module count */}
      <p className="text-sm text-muted-foreground mb-3">
        {course._count.modules} {course._count.modules === 1 ? 'module' : 'modules'}
      </p>

      {/* Error message */}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/courses/${course.id}`}>Edit</Link>
        </Button>

        {isConfirming ? (
          <>
            <span className="text-sm text-muted-foreground">Delete course and all modules?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Confirm'}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirming(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
