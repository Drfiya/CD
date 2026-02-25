'use client';

import { isSameMonth, isToday, format } from 'date-fns';
import type { EventOccurrence } from '@/lib/event-actions';

interface CalendarDayCellProps {
  day: Date;
  events: EventOccurrence[];
  currentMonth: Date;
}

export function CalendarDayCell({
  day,
  events,
  currentMonth,
}: CalendarDayCellProps) {
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isDayToday = isToday(day);
  const maxEventsToShow = 2;

  return (
    <div
      className={`bg-white min-h-[100px] p-1 ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
        }`}
    >
      {/* Day number */}
      <div
        className={`w-7 h-7 flex items-center justify-center text-sm mb-1 ${isDayToday
            ? 'bg-red-600 text-white rounded-full font-semibold'
            : isCurrentMonth
              ? 'text-gray-900'
              : 'text-gray-400'
          }`}
      >
        {format(day, 'd')}
      </div>

      {/* Events */}
      <div className="space-y-0.5">
        {events.slice(0, maxEventsToShow).map((occurrence, index) => (
          <div
            key={`${occurrence.event.id}-${index}`}
            className="text-xs px-1.5 py-0.5 bg-red-100 text-red-800 rounded truncate cursor-pointer hover:bg-red-200 transition-colors"
            title={occurrence.event.title}
          >
            {occurrence.event.title}
          </div>
        ))}

        {events.length > maxEventsToShow && (
          <div className="text-xs text-gray-500 px-1.5">
            +{events.length - maxEventsToShow} more
          </div>
        )}
      </div>
    </div>
  );
}
