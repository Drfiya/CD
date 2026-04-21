'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BadgeGlyph } from '@/components/gamification/badge-glyph';
import { DESCRIPTION_MAX, type Definition } from './badge-designer-types';

export function BadgeDefinitionEditor({
  def,
  isPending,
  onSave,
  onDelete,
  onOpenGrant,
}: {
  def: Definition;
  isPending: boolean;
  onSave: (
    patch: Partial<Definition> &
      Pick<Definition, 'label' | 'description' | 'emoji' | 'colorHex' | 'sortOrder' | 'isActive' | 'iconUrl'>
  ) => void;
  onDelete: () => void;
  onOpenGrant: () => void;
}) {
  const [label, setLabel] = useState(def.label);
  const [description, setDescription] = useState(def.description);
  const [emoji, setEmoji] = useState(def.emoji);
  const [colorHex, setColorHex] = useState(def.colorHex);
  const [sortOrder, setSortOrder] = useState(def.sortOrder);
  const [isActive, setIsActive] = useState(def.isActive);
  const [iconUrl, setIconUrl] = useState(def.iconUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSystem = def.type !== null;

  const handleIconUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/upload/badge-icon', {
        method: 'POST',
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setUploadError(data.error ?? 'Upload failed');
        return;
      }
      setIconUrl(data.url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Live preview */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: colorHex + '20', border: `2px solid ${colorHex}` }}
        >
          <BadgeGlyph
            iconUrl={iconUrl}
            emoji={emoji || '?'}
            label={label || 'Badge preview'}
            colorHex={colorHex}
            size={32}
          />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-neutral-100">{label || '(no label)'}</p>
          <p className="text-sm text-gray-600 dark:text-neutral-400 truncate">
            {description || '(no description)'}
          </p>
          <p className="text-xs mt-1 text-gray-400 dark:text-neutral-500">
            key: <code className="font-mono">{def.key}</code> ·{' '}
            {isSystem ? `system (${def.type})` : 'custom'} · {def._count.badges} earned
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={60}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isPending}
          />
        </label>

        <label className="block">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Emoji fallback</span>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={16}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isPending}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            disabled={isPending}
          />
          <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500 text-right">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </label>

        <label className="block">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Accent color</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-10 h-10 rounded-md border border-gray-300 dark:border-neutral-700 shadow-sm cursor-pointer"
              disabled={isPending}
              aria-label="Accent color"
            />
            <input
              type="text"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              maxLength={7}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              disabled={isPending}
            />
          </div>
        </label>

        <label className="block">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Sort order</span>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            min={0}
            max={9999}
            className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
            disabled={isPending}
          />
        </label>

        <div className="md:col-span-2">
          <span className="block text-sm text-gray-700 dark:text-neutral-300 mb-1">Icon upload</span>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleIconUpload(f);
              }}
              className="text-sm file:mr-3 file:rounded-md file:border file:border-gray-300 file:dark:border-neutral-700 file:bg-gray-50 file:dark:bg-neutral-900 file:text-gray-900 file:dark:text-neutral-100 file:px-3 file:py-1.5 text-gray-700 dark:text-neutral-300"
              disabled={isPending || uploading}
            />
            {iconUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIconUrl(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isPending || uploading}
              >
                Remove
              </Button>
            )}
          </div>
          {uploading && (
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">Uploading…</p>
          )}
          {uploadError && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300">{uploadError}</p>
          )}
          <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            PNG / JPEG / WEBP / SVG · max 256 KB · recommended 512×512 · transparent SVG works best
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-neutral-500">
            Free icons:{' '}
            <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand,#D94A4A)] hover:underline">Lucide Icons</a>
            {' · '}
            <a href="https://heroicons.com" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand,#D94A4A)] hover:underline">Heroicons</a>
            {' · '}
            <a href="https://flaticon.com" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand,#D94A4A)] hover:underline">Flaticon</a>
          </p>
        </div>

        <label className="flex items-center gap-2 md:col-span-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
            disabled={isPending}
          />
          <span className="text-sm text-gray-700 dark:text-neutral-300">Active (visible on profiles)</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          {!isSystem && (
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={isPending}>
              Delete
            </Button>
          )}
          {def.condition === 'manual' && (
            <Button variant="ghost" size="sm" onClick={onOpenGrant} disabled={isPending}>
              Grant to member
            </Button>
          )}
        </div>
        <Button
          onClick={() =>
            onSave({
              label,
              description,
              emoji,
              colorHex,
              sortOrder,
              isActive,
              iconUrl,
            })
          }
          disabled={isPending || uploading}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  );
}
