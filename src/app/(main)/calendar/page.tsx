import { Suspense } from 'react';
import { getEventsForMonth, getUpcomingEvents } from '@/lib/event-actions';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';
import { CalendarClient } from './calendar-client';

async function CalendarData({
  year,
  month,
  eventMessages,
}: {
  year: number;
  month: number;
  eventMessages: import('@/lib/i18n/messages/en').Messages['eventsPage'];
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
      eventMessages={eventMessages}
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
  // Fail-open language resolution — calendar should never white-screen
  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch (err) {
    console.error('[Calendar] getUserLanguage failed, defaulting to en:', err);
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">{messages.nav.calendar}</h1>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarData year={year} month={month} eventMessages={messages.eventsPage} />
      </Suspense>
    </div>
  );
}
