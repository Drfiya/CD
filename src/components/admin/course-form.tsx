'use client';

import { useTransition, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCourse, updateCourse } from '@/lib/course-actions';
import { CourseImageUpload } from '@/components/admin/course-image-upload';
import type { CourseStatus } from '@/generated/prisma/client';

interface CourseFormProps {
  course?: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    status: CourseStatus;
  };
  onSuccess?: () => void;
}

export function CourseForm({ course, onSuccess }: CourseFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!course;

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);

      const result = isEdit
        ? await updateCourse(course.id, formData)
        : await createCourse(formData);

      if ('error' in result) {
        if (typeof result.error === 'string') {
          setError(result.error);
        } else if (result.error && typeof result.error === 'object') {
          const fieldErrors = result.error as Record<string, string[]>;
          const firstError = Object.values(fieldErrors).flat()[0];
          setError(firstError || 'Invalid input');
        }
        return;
      }

      if (!isEdit) {
        formRef.current?.reset();
      }

      router.refresh();
      onSuccess?.();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
          Title
        </label>
        <input
          id="course-title"
          name="title"
          type="text"
          placeholder="Course title"
          required
          minLength={3}
          maxLength={100}
          defaultValue={course?.title || ''}
          className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
          Description
        </label>
        <textarea
          id="course-description"
          name="description"
          placeholder="Course description (optional)"
          maxLength={2000}
          rows={3}
          defaultValue={course?.description || ''}
          className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          disabled={isPending}
        />
      </div>

      {/* Status */}
      <div>
        <label htmlFor="course-status" className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-1">
          Status
        </label>
        <select
          id="course-status"
          name="status"
          defaultValue={course?.status || 'DRAFT'}
          className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        >
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      {/* Cover Image - only show for existing courses */}
      {isEdit && course && (
        <CourseImageUpload
          courseId={course.id}
          currentImageUrl={course.coverImage}
        />
      )}

      {/* Error */}
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}

      {/* Submit */}
      <Button type="submit" disabled={isPending}>
        {isPending
          ? isEdit
            ? 'Saving...'
            : 'Creating...'
          : isEdit
            ? 'Save Changes'
            : 'Create Course'}
      </Button>
    </form>
  );
}
