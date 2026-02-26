'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateLesson, deleteLesson } from '@/lib/lesson-actions';
import { parseVideoUrl } from '@/lib/video-utils';
import { LessonEditor } from '@/components/admin/lesson-editor';
import { AttachmentList } from '@/components/admin/attachment-list';
import { VideoEmbedPlayer } from '@/components/video/video-embed';
import { Button } from '@/components/ui/button';
import type { LessonWithModule } from '@/types/course';

interface LessonEditFormProps {
  lesson: LessonWithModule;
}

export function LessonEditForm({ lesson }: LessonEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [title, setTitle] = useState(lesson.title);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED'>(lesson.status);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl || '');
  const [content, setContent] = useState<object>(lesson.content as object);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse video URL for preview
  const videoEmbed = videoUrl ? parseVideoUrl(videoUrl) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', JSON.stringify(content));
      formData.append('videoUrl', videoUrl);
      formData.append('status', status);

      const result = await updateLesson(lesson.id, formData);

      if (result.error) {
        if (typeof result.error === 'string') {
          setError(result.error);
        } else {
          // Field errors from validation
          const fieldErrors = Object.entries(result.error)
            .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
            .join('; ');
          setError(fieldErrors);
        }
      } else {
        setSuccess(true);
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    });
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setIsDeleting(true);
    const result = await deleteLesson(lesson.id);

    if (result.error) {
      setError(typeof result.error === 'string' ? result.error : 'Delete failed');
      setIsDeleting(false);
      setConfirmDelete(false);
    } else {
      // Redirect back to course page
      router.push(`/admin/courses/${lesson.module.courseId}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title input */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Lesson Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-700 dark:text-neutral-100"
            placeholder="Enter lesson title..."
            required
            minLength={3}
            maxLength={200}
          />
        </div>

        {/* Status select */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'DRAFT' | 'PUBLISHED')}
            className="w-full rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-700 dark:text-neutral-100"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
      </div>

      {/* Video section */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Video (optional)</h2>

        <div>
          <label htmlFor="videoUrl" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
            Video URL
          </label>
          <input
            id="videoUrl"
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="w-full rounded-md border border-gray-300 dark:border-neutral-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-700 dark:text-neutral-100"
            placeholder="Paste YouTube, Vimeo, or Loom URL..."
          />
          <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">
            Supported: YouTube, Vimeo, Loom
          </p>
        </div>

        {/* Video preview */}
        {videoEmbed && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Preview:</p>
            <div className="max-w-xl">
              <VideoEmbedPlayer embed={videoEmbed} />
            </div>
          </div>
        )}

        {videoUrl && !videoEmbed && (
          <p className="text-sm text-amber-600">
            Could not parse video URL. Make sure it&apos;s a valid YouTube, Vimeo, or Loom link.
          </p>
        )}
      </div>

      {/* Content section */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Lesson Content</h2>

        <LessonEditor
          content={JSON.stringify(content)}
          onChange={(json) => setContent(json)}
        />
      </div>

      {/* Attachments section */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-medium">Attachments</h2>

        <AttachmentList
          attachments={lesson.attachments}
          lessonId={lesson.id}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">Lesson saved successfully!</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting || isPending}
        >
          {isDeleting
            ? 'Deleting...'
            : confirmDelete
              ? 'Click again to confirm'
              : 'Delete Lesson'}
        </Button>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Lesson'}
        </Button>
      </div>

      {/* Click outside to cancel delete confirmation */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setConfirmDelete(false)}
        />
      )}
    </form>
  );
}
