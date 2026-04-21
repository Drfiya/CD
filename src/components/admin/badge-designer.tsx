'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BadgeGlyph } from '@/components/gamification/badge-glyph';
import {
  createCustomBadgeDefinition,
  deleteBadgeDefinition,
  grantCustomBadge,
  updateBadgeDefinition,
} from '@/lib/badge-definition-actions';
import type { Definition, Member } from './badge-designer-types';
import { BadgeDefinitionEditor } from './badge-definition-editor';
import { BadgeCreateCustomModal } from './badge-create-custom-modal';
import { BadgeManualGrantModal } from './badge-manual-grant-modal';

interface BadgeDesignerProps {
  definitions: Definition[];
  members: Member[];
}

export function BadgeDesigner({ definitions, members }: BadgeDesignerProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    definitions[0]?.id ?? null
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showGrant, setShowGrant] = useState(false);

  const [optimisticDefinitions, applyOptimistic] = useOptimistic(
    definitions,
    (state, patch: Definition) =>
      patch.id.startsWith('__deleted:')
        ? state.filter((d) => d.id !== patch.id.slice('__deleted:'.length))
        : state.some((d) => d.id === patch.id)
          ? state.map((d) => (d.id === patch.id ? patch : d))
          : [...state, patch]
  );

  const selected = optimisticDefinitions.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
      {/* --- Left column: definition list --- */}
      <aside className="border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 p-3 space-y-1">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-neutral-100">
            Badges
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowCreate(true)}
            disabled={isPending}
          >
            + New
          </Button>
        </div>
        <ul className="space-y-1">
          {optimisticDefinitions.map((d) => {
            const isSel = d.id === selected?.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                    isSel
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-900 dark:text-neutral-100'
                  }`}
                >
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center">
                    <BadgeGlyph
                      iconUrl={d.iconUrl}
                      emoji={d.emoji}
                      label={d.label}
                      colorHex={d.colorHex}
                      size={24}
                    />
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm">{d.label}</span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wide shrink-0 ${
                      isSel ? 'text-primary-foreground/80' : 'text-gray-400 dark:text-neutral-500'
                    }`}
                  >
                    {d.condition}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* --- Right column: editor + preview --- */}
      <section className="border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 p-5">
        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-300">{error}</p>
        )}

        {!selected ? (
          <p className="text-gray-500 dark:text-neutral-400">Select a badge to edit.</p>
        ) : (
          <BadgeDefinitionEditor
            key={selected.id}
            def={selected}
            isPending={isPending}
            onSave={(patch) => {
              startTransition(async () => {
                setError(null);
                applyOptimistic({ ...selected, ...patch });

                const fd = new FormData();
                fd.set('label', patch.label);
                fd.set('description', patch.description);
                fd.set('emoji', patch.emoji);
                fd.set('colorHex', patch.colorHex);
                fd.set('sortOrder', String(patch.sortOrder));
                fd.set('isActive', patch.isActive ? 'true' : 'false');
                if (patch.iconUrl) fd.set('iconUrl', patch.iconUrl);

                const result = await updateBadgeDefinition(selected.id, fd);
                if (result.error) {
                  setError(result.error);
                }
                router.refresh();
              });
            }}
            onDelete={() => {
              startTransition(async () => {
                setError(null);
                applyOptimistic({ ...selected, id: `__deleted:${selected.id}` });
                const result = await deleteBadgeDefinition(selected.id);
                if (result.error) {
                  setError(result.error);
                  router.refresh();
                  return;
                }
                setSelectedId(optimisticDefinitions[0]?.id ?? null);
                router.refresh();
              });
            }}
            onOpenGrant={() => setShowGrant(true)}
          />
        )}
      </section>

      {showCreate && (
        <BadgeCreateCustomModal
          onClose={() => setShowCreate(false)}
          onSubmit={(fd) => {
            startTransition(async () => {
              setError(null);
              const result = await createCustomBadgeDefinition(fd);
              if (result.error) {
                setError(result.error);
                return;
              }
              setShowCreate(false);
              if (result.id) setSelectedId(result.id);
              router.refresh();
            });
          }}
          isPending={isPending}
        />
      )}

      {showGrant && selected && selected.condition === 'manual' && (
        <BadgeManualGrantModal
          definition={selected}
          members={members}
          onClose={() => setShowGrant(false)}
          onGrant={(userId) => {
            startTransition(async () => {
              setError(null);
              const result = await grantCustomBadge(userId, selected.id);
              if (result.error) {
                setError(result.error);
                return;
              }
              setShowGrant(false);
              router.refresh();
            });
          }}
          isPending={isPending}
        />
      )}
    </div>
  );
}
