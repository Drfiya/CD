'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { deleteEvent } from '@/lib/event-actions';
import type { RecurrenceType } from '@/types/event';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    location: string | null;
    recurrence: RecurrenceType;
  };
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    startTransition(async () => {
      setError(null);
      const result = await deleteEvent(event.id);

      if ('error' in result) {
        setError(typeof result.error === 'string' ? result.error : 'Failed to delete event');
        setIsConfirming(false);
        return;
      }

      setIsConfirming(false);
      router.refresh();
    });
  };

  return (
    <div className="border dark:border-neutral-700 rounded-lg p-4 bg-white dark:bg-neutral-800 hover:shadow-sm transition-shadow">
      {/* Header with recurrence badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/admin/events/${event.id}`}
          className="text-lg font-semibold hover:text-primary transition-colors"
        >
          {event.title}
        </Link>
        {event.recurrence !== 'NONE' && (
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
            {event.recurrence === 'WEEKLY' ? 'Weekly' : 'Monthly'}
          </span>
        )}
      </div>

      {/* Date/time */}
      <p className="text-sm text-muted-foreground mb-1">
        {format(new Date(event.startTime), 'MMM d, yyyy h:mm a')} - {format(new Date(event.endTime), 'h:mm a')}
      </p>

      {/* Location */}
      {event.location && (
        <p className="text-sm text-muted-foreground mb-3">
          {event.location}
        </p>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/events/${event.id}`}>Edit</Link>
        </Button>

        {isConfirming ? (
          <>
            <span className="text-sm text-muted-foreground">Delete event?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirming(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? 'Deleting...' : 'Confirm'}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsConfirming(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
