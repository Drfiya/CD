import { Suspense } from 'react';
import { getEventsForMonth, getUpcomingEvents } from '@/lib/event-actions';
import { CalendarClient } from './calendar-client';
import { tMany } from '@/lib/translation/helpers';

async function CalendarData({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const [monthEvents, upcomingEvents] = await Promise.all([
    getEventsForMonth(year, month),
    getUpcomingEvents(90),
  ]);

  return (
    <CalendarClient
      initialMonthEvents={monthEvents}
      initialUpcomingEvents={upcomingEvents}
      initialYear={year}
      initialMonth={month}
    />
  );
}

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-40 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="border border-gray-100 dark:border-neutral-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-neutral-700">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-gray-50 dark:bg-neutral-800 p-2 h-10" />
          ))}
          {[...Array(35)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-neutral-800 min-h-[100px] p-1" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Translate all UI text dynamically via DeepL
  const ui = await tMany({
    title: 'Calendar',
  }, 'calendar');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">{ui.title}</h1>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData year={year} month={month} />
      </Suspense>
    </div>
  );
}
