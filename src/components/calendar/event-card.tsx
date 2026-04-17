'use client';

import Link from 'next/link';
import Image from 'next/image';
import { EventTime } from './event-time';
import { UGCText } from '@/components/translation/UGCText';
import type { EventOccurrence } from '@/lib/event-actions';
import type { Messages } from '@/lib/i18n/messages/en';

interface EventCardProps {
  occurrence: EventOccurrence;
  messages: Messages['eventsPage'];
}

export function EventCard({ occurrence, messages }: EventCardProps) {
  const { event } = occurrence;

  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-neutral-500 hover:shadow-sm transition-all"
    >
      <div className="flex gap-4">
        {/* Cover image thumbnail */}
        {event.coverImage && (
          <div className="flex-shrink-0 w-24 h-24 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-neutral-700">
            <Image
              src={event.coverImage}
              alt={event.title}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Title and badges */}
          <div className="flex items-start gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-neutral-100 truncate flex-1">
              <UGCText as="span">{event.title}</UGCText>
            </h3>
            {event.recurrence !== 'NONE' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 flex-shrink-0">
                {event.recurrence === 'WEEKLY' ? messages.weekly : messages.monthly}
              </span>
            )}
          </div>

          {/* Date/time */}
          <div className="mb-2">
            <EventTime start={event.startTime} end={event.endTime} />
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-neutral-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 flex-shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              <span className="truncate">
                {event.locationUrl ? (
                  <span
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      window.open(event.locationUrl!, '_blank');
                    }}
                  >
                    {event.location}
                  </span>
                ) : (
                  event.location
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
