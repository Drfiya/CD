'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ModuleForm } from '@/components/admin/module-form';
import { deleteModule } from '@/lib/module-actions';

interface Module {
  id: string;
  title: string;
  position: number;
}

interface ModuleListProps {
  modules: Module[];
  courseId: string;
}

export function ModuleList({ modules, courseId }: ModuleListProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = (moduleId: string) => {
    startTransition(async () => {
      setError(null);
      const result = await deleteModule(moduleId);

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete module');
        setConfirmingId(null);
        return;
      }

      setConfirmingId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Module list */}
      {modules.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No modules yet. Add your first module below.
        </p>
      ) : (
        <div className="space-y-2">
          {modules.map((module) => (
            <div
              key={module.id}
              className="flex items-center justify-between p-3 border dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
            >
              {editingId === module.id ? (
                <div className="flex-1">
                  <ModuleForm
                    courseId={courseId}
                    module={module}
                    onSuccess={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-8">
                      #{module.position + 1}
                    </span>
                    <span className="font-medium">{module.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {confirmingId === module.id ? (
                      <>
                        <span className="text-sm text-muted-foreground">Delete this module?</span>
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
                          onClick={() => handleDelete(module.id)}
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
                          onClick={() => setEditingId(module.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmingId(module.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add module form */}
      <div className="pt-4 border-t">
        {isAdding ? (
          <ModuleForm
            courseId={courseId}
            onSuccess={() => setIsAdding(false)}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <Button variant="outline" onClick={() => setIsAdding(true)}>
            Add Module
          </Button>
        )}
      </div>
    </div>
  );
}
