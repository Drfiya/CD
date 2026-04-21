'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { deleteCategory, updateCategory } from '@/lib/category-actions';

const DESCRIPTION_MAX = 280;

interface Category {
  id: string;
  name: string;
  color: string;
  description: string | null;
  _count?: {
    posts: number;
  };
}

interface CategoryListProps {
  categories: Category[];
}

type EditDraft = {
  name: string;
  color: string;
  description: string;
};

export function CategoryList({ categories }: CategoryListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic list — lets name/color/description updates appear instantly
  // while the server action is still in-flight (P1-4 pattern).
  const [optimisticCategories, applyOptimistic] = useOptimistic(
    categories,
    (state, patch: Category) =>
      state.map((c) => (c.id === patch.id ? { ...c, ...patch } : c))
  );

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setConfirmingId(null);
    setError(null);
    setDraft({ name: c.name, color: c.color, description: c.description ?? '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError(null);
  };

  const handleSave = (c: Category) => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError('Category name is required');
      return;
    }
    if (draft.description.length > DESCRIPTION_MAX) {
      setError(`Description must be under ${DESCRIPTION_MAX} characters`);
      return;
    }

    const patch: Category = {
      ...c,
      name,
      color: draft.color,
      description: draft.description.trim() ? draft.description.trim() : null,
    };

    startTransition(async () => {
      setError(null);
      // Optimistic UI: render new state immediately.
      applyOptimistic(patch);
      setEditingId(null);

      const formData = new FormData();
      formData.set('name', patch.name);
      formData.set('color', patch.color);
      formData.set('description', patch.description ?? '');

      const result = await updateCategory(c.id, formData);

      if (result && 'error' in result) {
        const err = result.error;
        setError(
          typeof err === 'string'
            ? err
            : (Object.values(err as Record<string, string[]>).flat()[0] ?? 'Failed to update category')
        );
        // Revert optimistic update by refreshing server state
        router.refresh();
        return;
      }

      router.refresh();
    });
  };

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

  if (optimisticCategories.length === 0) {
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

      {optimisticCategories.map((category) => {
        const isEditing = editingId === category.id;
        const isConfirming = confirmingId === category.id;

        return (
          <div
            key={category.id}
            className="p-3 border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
          >
            {isEditing && draft ? (
              <div className="space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    className="w-10 h-10 rounded-md border border-gray-300 dark:border-neutral-700 shadow-sm cursor-pointer"
                    disabled={isPending}
                    aria-label="Category color"
                  />
                  <input
                    type="text"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    maxLength={50}
                    placeholder="Category name"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    maxLength={DESCRIPTION_MAX}
                    rows={2}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    disabled={isPending}
                  />
                  <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500 text-right">
                    {draft.description.length}/{DESCRIPTION_MAX}
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleSave(category)} disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="w-6 h-6 shrink-0 rounded-md border border-gray-300 dark:border-neutral-700 shadow-sm mt-0.5"
                    style={{ backgroundColor: category.color }}
                    aria-label={`Color: ${category.color}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-neutral-100">
                        {category.name}
                      </span>
                      {category._count && (
                        <span className="text-sm text-gray-500 dark:text-neutral-400">
                          ({category._count.posts} {category._count.posts === 1 ? 'post' : 'posts'})
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400 whitespace-pre-wrap break-words">
                        {category.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isConfirming ? (
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
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(category)}
                        disabled={isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingId(category.id)}
                        disabled={isPending}
                        className="text-red-600 dark:text-red-300 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
