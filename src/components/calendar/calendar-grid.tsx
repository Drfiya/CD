'use client';

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import { CalendarDayCell } from './calendar-day-cell';
import type { EventOccurrence } from '@/lib/event-actions';

interface CalendarGridProps {
  events: EventOccurrence[];
  currentMonth: Date;
}

export function CalendarGrid({ events, currentMonth }: CalendarGridProps) {
  // Generate calendar grid days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Helper to get events for a specific day
  const getEventsForDay = (day: Date): EventOccurrence[] => {
    return events.filter((occurrence) =>
      isSameDay(occurrence.occurrenceDate, day)
    );
  };

  // Day of week headers
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl shadow-sm overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-neutral-700">
        {/* Header row */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-50 dark:bg-neutral-800 p-2 text-center text-sm font-medium text-gray-500 dark:text-neutral-400"
          >
            {day}
          </div>
        ))}

        {/* Day cells */}
        {days.map((day) => (
          <CalendarDayCell
            key={day.toISOString()}
            day={day}
            events={getEventsForDay(day)}
            currentMonth={currentMonth}
          />
        ))}
      </div>
    </div>
  );
}
