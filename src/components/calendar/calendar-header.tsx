'use client';

import { format, addMonths, subMonths, startOfMonth } from 'date-fns';

interface CalendarHeaderProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function CalendarHeader({
  currentMonth,
  onMonthChange,
}: CalendarHeaderProps) {
  const handlePreviousMonth = () => {
    onMonthChange(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    onMonthChange(startOfMonth(new Date()));
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
        {format(currentMonth, 'MMMM yyyy')}
      </h2>

      <div className="flex items-center gap-3 ml-6">
        <button
          onClick={handleToday}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
        >
          Today
        </button>

        <div className="flex items-center">
          <button
            onClick={handlePreviousMonth}
            className="p-1.5 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
            aria-label="Previous month"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>

          <button
            onClick={handleNextMonth}
            className="p-1.5 text-gray-600 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-neutral-100 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
            aria-label="Next month"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
