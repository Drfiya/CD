'use client';

import { useTransition, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createCategory } from '@/lib/category-actions';

const DESCRIPTION_MAX = 280;

export function CategoryForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [descLen, setDescLen] = useState(0);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      const result = await createCategory(formData);

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

      formRef.current?.reset();
      setDescLen(0);
      router.refresh();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
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
            defaultValue="#D94A4A"
            className="w-10 h-10 rounded-md border border-gray-300 dark:border-neutral-700 shadow-sm cursor-pointer"
            disabled={isPending}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Creating...' : 'Create Category'}
        </Button>
      </div>

      {/* Description textarea */}
      <div>
        <label htmlFor="category-description" className="block text-sm text-gray-500 dark:text-neutral-400 mb-1">
          Description <span className="text-gray-400 dark:text-neutral-500">(optional)</span>
        </label>
        <textarea
          id="category-description"
          name="description"
          rows={2}
          maxLength={DESCRIPTION_MAX}
          placeholder="Short description shown beneath the category name"
          className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          disabled={isPending}
          onChange={(e) => setDescLen(e.target.value.length)}
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500 text-right">
          {descLen}/{DESCRIPTION_MAX}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
      )}
    </form>
  );
}
