'use client';

import { useState, useTransition } from 'react';
import { startOfMonth, getYear, getMonth } from 'date-fns';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarGrid } from '@/components/calendar/calendar-grid';
import { EventList } from '@/components/calendar/event-list';
import { ViewToggle } from '@/components/calendar/view-toggle';
import { getEventsForMonth } from '@/lib/event-actions';
import type { EventOccurrence } from '@/lib/event-actions';

interface CalendarClientProps {
  initialMonthEvents: EventOccurrence[];
  initialUpcomingEvents: EventOccurrence[];
  initialYear: number;
  initialMonth: number;
}

export function CalendarClient({
  initialMonthEvents,
  initialUpcomingEvents,
  initialYear,
  initialMonth,
}: CalendarClientProps) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(
    startOfMonth(new Date(initialYear, initialMonth, 1))
  );
  const [monthEvents, setMonthEvents] =
    useState<EventOccurrence[]>(initialMonthEvents);
  const [isPending, startTransition] = useTransition();

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);

    // Fetch events for the new month
    startTransition(async () => {
      const year = getYear(newMonth);
      const month = getMonth(newMonth);
      const events = await getEventsForMonth(year, month);
      setMonthEvents(events);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {view === 'calendar' && (
          <CalendarHeader
            currentMonth={currentMonth}
            onMonthChange={handleMonthChange}
          />
        )}
        {view === 'list' && <div />}
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {isPending && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" />
        </div>
      )}

      {!isPending && (
        <>
          {view === 'calendar' && (
            <CalendarGrid events={monthEvents} currentMonth={currentMonth} />
          )}

          {view === 'list' && <EventList events={initialUpcomingEvents} />}
        </>
      )}
    </div>
  );
}
