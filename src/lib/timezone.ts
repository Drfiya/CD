'use client';

import { TZDate } from '@date-fns/tz';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';

// Hook to detect user's timezone (client-side only)
export function useUserTimezone(): string {
  const [timezone, setTimezone] = useState('UTC');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: Intl is browser-only, must read after mount
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);
  return timezone;
}

// Hook to detect 12h vs 24h time preference
export function useTimeFormat(): '12' | '24' {
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('12');
  useEffect(() => {
    const resolved = Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: Intl is browser-only
    setTimeFormat(resolved.hour12 ? '12' : '24');
  }, []);
  return timeFormat;
}

// Format event time in user's timezone
export function formatEventTime(
  utcDate: Date,
  timezone: string,
  pattern: string = 'MMM d, yyyy h:mm a'
): string {
  const tzDate = new TZDate(utcDate, timezone);
  return format(tzDate, pattern);
}

// Convert UTC date to datetime-local input value in user's timezone
export function toLocalDatetimeString(utcDate: Date, timezone: string): string {
  const tzDate = new TZDate(utcDate, timezone);
  return format(tzDate, "yyyy-MM-dd'T'HH:mm");
}

// Get timezone as non-hook for server components (returns UTC for SSR safety)
export function getTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
