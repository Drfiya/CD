'use client';

import { useTransition, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCategory } from '@/lib/category-actions';

export function CategoryForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      const result = await createCategory(formData);

      if ('error' in result) {
        // Handle error - could be string or field errors object
        if (typeof result.error === 'string') {
          setError(result.error);
        } else if (result.error && typeof result.error === 'object') {
          // Field errors - extract first error message
          const fieldErrors = result.error as Record<string, string[]>;
          const firstError = Object.values(fieldErrors).flat()[0];
          setError(firstError || 'Invalid input');
        }
        return;
      }

      // Success - clear form
      formRef.current?.reset();
      router.refresh();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="flex gap-4">
        {/* Name input */}
        <div className="flex-1">
          <label htmlFor="category-name" className="sr-only">
            Category name
          </label>
          <input
            id="category-name"
            name="name"
            type="text"
            placeholder="Category name"
            required
            maxLength={50}
            className="w-full px-3 py-2 border dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Color picker */}
        <div className="flex items-center gap-2">
          <label htmlFor="category-color" className="text-sm text-gray-500 dark:text-neutral-400">
            Color
          </label>
          <input
            id="category-color"
            name="color"
            type="color"
            defaultValue="#6366f1"
            className="w-10 h-10 rounded-md border dark:border-neutral-600 shadow-sm cursor-pointer"
            disabled={isPending}
          />
        </div>

        {/* Submit button */}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Category'}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      )}
    </form>
  );
}
