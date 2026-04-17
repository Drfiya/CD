'use client';

import {
  isToday,
  isTomorrow,
  isThisWeek,
  format,
  startOfDay,
} from 'date-fns';
import { EventCard } from './event-card';
import type { EventOccurrence } from '@/lib/event-actions';
import type { Messages } from '@/lib/i18n/messages/en';

interface EventListProps {
  events: EventOccurrence[];
  messages: Messages['eventsPage'];
}

type DateGroup = {
  label: string;
  events: EventOccurrence[];
};

export function EventList({ events, messages }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-neutral-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-neutral-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
          />
        </svg>
        <p className="font-medium">{messages.noUpcomingEvents}</p>
        <p className="text-sm">{messages.checkBackLater}</p>
      </div>
    );
  }

  // Group events by date category
  const groups: DateGroup[] = [];
  const today: EventOccurrence[] = [];
  const tomorrow: EventOccurrence[] = [];
  const thisWeek: EventOccurrence[] = [];
  const later: EventOccurrence[] = [];

  for (const occurrence of events) {
    const date = occurrence.occurrenceDate;

    if (isToday(date)) {
      today.push(occurrence);
    } else if (isTomorrow(date)) {
      tomorrow.push(occurrence);
    } else if (isThisWeek(date)) {
      thisWeek.push(occurrence);
    } else {
      later.push(occurrence);
    }
  }

  if (today.length > 0) {
    groups.push({ label: messages.today, events: today });
  }
  if (tomorrow.length > 0) {
    groups.push({ label: messages.tomorrow, events: tomorrow });
  }
  if (thisWeek.length > 0) {
    groups.push({ label: messages.thisWeek, events: thisWeek });
  }
  if (later.length > 0) {
    // Sub-group later events by month
    const byMonth = new Map<string, EventOccurrence[]>();

    for (const occurrence of later) {
      const monthKey = format(occurrence.occurrenceDate, 'MMMM yyyy');
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, []);
      }
      byMonth.get(monthKey)!.push(occurrence);
    }

    for (const [month, monthEvents] of byMonth) {
      groups.push({ label: month, events: monthEvents });
    }
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
            {group.label}
          </h3>
          <div className="space-y-3">
            {group.events.map((occurrence, index) => (
              <EventCard
                key={`${occurrence.event.id}-${startOfDay(occurrence.occurrenceDate).getTime()}-${index}`}
                occurrence={occurrence}
                messages={messages}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
