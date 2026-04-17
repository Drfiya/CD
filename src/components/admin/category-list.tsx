'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteCategory } from '@/lib/category-actions';

interface Category {
  id: string;
  name: string;
  color: string;
  _count?: {
    posts: number;
  };
}

interface CategoryListProps {
  categories: Category[];
}

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (categoryId: string) => {
    startTransition(async () => {
      setError(null);
      const result = await deleteCategory(categoryId);

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete category');
        setConfirmingId(null);
        return;
      }

      setConfirmingId(null);
      router.refresh();
    });
  };

  if (categories.length === 0) {
    return (
      <p className="text-gray-500 dark:text-neutral-400 text-center py-8">
        No categories yet. Create your first category above.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">{error}</p>
      )}

      {categories.map((category) => (
        <div
          key={category.id}
          className="flex items-center justify-between p-3 border dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
        >
          {/* Color swatch and name */}
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-md border dark:border-neutral-700 shadow-sm"
              style={{ backgroundColor: category.color }}
              aria-label={`Color: ${category.color}`}
            />
            <span className="font-medium text-gray-900 dark:text-neutral-100">{category.name}</span>
            {category._count && (
              <span className="text-sm text-gray-500 dark:text-neutral-400">
                ({category._count.posts} {category._count.posts === 1 ? 'post' : 'posts'})
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {confirmingId === category.id ? (
              <>
                <span className="text-sm text-gray-500 dark:text-neutral-400 mr-2">
                  Are you sure? Posts will become uncategorized.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingId(null)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                  disabled={isPending}
                >
                  {isPending ? 'Deleting...' : 'Confirm'}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmingId(category.id)}
                className="text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
