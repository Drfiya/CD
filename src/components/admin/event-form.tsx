'use client';

import { useTransition, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { LessonEditor } from '@/components/admin/lesson-editor';
import { createEvent, updateEvent } from '@/lib/event-actions';
import type { RecurrenceType } from '@/types/event';

interface EventFormProps {
  event?: {
    id: string;
    title: string;
    description: unknown;
    startTime: Date;
    endTime: Date;
    location: string | null;
    locationUrl: string | null;
    coverImage: string | null;
    recurrence: RecurrenceType;
    recurrenceEnd: Date | null;
  };
  onSuccess?: () => void;
}

// Convert Date to datetime-local input value
function toDatetimeLocal(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function EventForm({ event, onSuccess }: EventFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState<object | null>(
    event?.description ? (event.description as object) : null
  );
  const [recurrence, setRecurrence] = useState<RecurrenceType>(event?.recurrence || 'NONE');
  const [timezone, setTimezone] = useState<string>('');

  const isEdit = !!event;

  // Get user's timezone on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: Intl is browser-only
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);

      // Add description JSON to form data
      if (description) {
        formData.set('description', JSON.stringify(description));
      } else {
        formData.set('description', JSON.stringify({ type: 'doc', content: [] }));
      }

      // Add timezone
      formData.set('timezone', timezone);

      const result = isEdit
        ? await updateEvent(event.id, formData)
        : await createEvent(formData);

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
        setDescription(null);
        setRecurrence('NONE');
      }

      router.refresh();

      if (!isEdit && 'eventId' in result) {
        router.push('/admin/events');
      }

      onSuccess?.();
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="event-title" className="block text-sm font-medium mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="event-title"
          name="title"
          type="text"
          placeholder="Event title"
          required
          minLength={1}
          maxLength={200}
          defaultValue={event?.title || ''}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
      </div>

      {/* Description (Tiptap editor) */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <LessonEditor
          content={event?.description ? JSON.stringify(event.description) : undefined}
          onChange={(json) => setDescription(json)}
        />
      </div>

      {/* Start Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-start" className="block text-sm font-medium mb-1">
            Start Time <span className="text-red-500">*</span>
          </label>
          <input
            id="event-start"
            name="startTime"
            type="datetime-local"
            required
            defaultValue={event?.startTime ? toDatetimeLocal(new Date(event.startTime)) : ''}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="event-end" className="block text-sm font-medium mb-1">
            End Time <span className="text-red-500">*</span>
          </label>
          <input
            id="event-end"
            name="endTime"
            type="datetime-local"
            required
            defaultValue={event?.endTime ? toDatetimeLocal(new Date(event.endTime)) : ''}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-location" className="block text-sm font-medium mb-1">
            Location
          </label>
          <input
            id="event-location"
            name="location"
            type="text"
            placeholder="e.g., Zoom, Conference Room A"
            maxLength={200}
            defaultValue={event?.location || ''}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          />
        </div>

        {/* Location URL */}
        <div>
          <label htmlFor="event-location-url" className="block text-sm font-medium mb-1">
            Location URL
          </label>
          <input
            id="event-location-url"
            name="locationUrl"
            type="url"
            placeholder="https://zoom.us/j/..."
            maxLength={500}
            defaultValue={event?.locationUrl || ''}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Cover Image URL */}
      <div>
        <label htmlFor="event-cover" className="block text-sm font-medium mb-1">
          Cover Image URL
        </label>
        <input
          id="event-cover"
          name="coverImage"
          type="url"
          placeholder="https://..."
          defaultValue={event?.coverImage || ''}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Optional: URL to an image for the event
        </p>
      </div>

      {/* Recurrence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="event-recurrence" className="block text-sm font-medium mb-1">
            Recurrence
          </label>
          <select
            id="event-recurrence"
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isPending}
          >
            <option value="NONE">None (single event)</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>

        {/* Recurrence End (only shown when recurrence != NONE) */}
        {recurrence !== 'NONE' && (
          <div>
            <label htmlFor="event-recurrence-end" className="block text-sm font-medium mb-1">
              Recurrence End
            </label>
            <input
              id="event-recurrence-end"
              name="recurrenceEnd"
              type="datetime-local"
              defaultValue={event?.recurrenceEnd ? toDatetimeLocal(new Date(event.recurrenceEnd)) : ''}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional: When the recurring event series ends
            </p>
          </div>
        )}
      </div>

      {/* Hidden timezone field */}
      <input type="hidden" name="timezone" value={timezone} />

      {/* Error */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Submit */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? isEdit
              ? 'Saving...'
              : 'Creating...'
            : isEdit
            ? 'Save Changes'
            : 'Create Event'}
        </Button>
        {isEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/events')}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
