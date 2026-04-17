'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { eventSchema } from '@/lib/validations/event';
import type { Prisma } from '@/generated/prisma/client';
import { TZDate } from '@date-fns/tz';
import {
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  isBefore,
  isAfter,
  isWithinInterval,
} from 'date-fns';
import type { EventWithCreator } from '@/types/event';
import { requireAuth, requireAdmin } from '@/lib/auth-guards';

export async function getEvents(rangeStart?: Date, rangeEnd?: Date) {
  await requireAuth();
  const whereClause: Prisma.EventWhereInput = {};

  if (rangeStart || rangeEnd) {
    whereClause.startTime = {};
    if (rangeStart) {
      whereClause.startTime.gte = rangeStart;
    }
    if (rangeEnd) {
      whereClause.startTime.lte = rangeEnd;
    }
  }

  const events = await db.event.findMany({
    where: whereClause,
    orderBy: { startTime: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return events;
}

export async function getEvent(id: string) {
  await requireAuth();
  const event = await db.event.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  return event;
}

export async function createEvent(formData: FormData) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    location: formData.get('location') || null,
    locationUrl: formData.get('locationUrl') || null,
    coverImage: formData.get('coverImage') || null,
    recurrence: formData.get('recurrence') || 'NONE',
    recurrenceEnd: formData.get('recurrenceEnd') || null,
  };

  const validatedFields = eventSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, startTime, endTime, location, locationUrl, coverImage, recurrence, recurrenceEnd } = validatedFields.data;

  // Parse as local time in user's timezone, convert to UTC
  const timezone = (formData.get('timezone') as string) || 'UTC';
  const startTz = new TZDate(startTime, timezone);
  const endTz = new TZDate(endTime, timezone);
  const startTimeDate = new Date(startTz.getTime());
  const endTimeDate = new Date(endTz.getTime());
  const recurrenceEndDate = recurrenceEnd
    ? new Date(new TZDate(recurrenceEnd, timezone).getTime())
    : null;

  const event = await db.event.create({
    data: {
      title,
      description: description as Prisma.InputJsonValue,
      startTime: startTimeDate,
      endTime: endTimeDate,
      location: location || null,
      locationUrl: locationUrl || null,
      coverImage: coverImage || null,
      recurrence,
      recurrenceEnd: recurrenceEndDate,
      createdById: session.user.id,
    },
  });

  revalidatePath('/calendar');
  revalidatePath('/admin/events');

  return { success: true, eventId: event.id };
}

export async function updateEvent(eventId: string, formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { error: 'Event not found' };
  }

  const rawData = {
    title: formData.get('title'),
    description: formData.get('description'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    location: formData.get('location') || null,
    locationUrl: formData.get('locationUrl') || null,
    coverImage: formData.get('coverImage') || null,
    recurrence: formData.get('recurrence') || 'NONE',
    recurrenceEnd: formData.get('recurrenceEnd') || null,
  };

  const validatedFields = eventSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { title, description, startTime, endTime, location, locationUrl, coverImage, recurrence, recurrenceEnd } = validatedFields.data;

  // Parse as local time in user's timezone, convert to UTC
  const timezone = (formData.get('timezone') as string) || 'UTC';
  const startTz = new TZDate(startTime, timezone);
  const endTz = new TZDate(endTime, timezone);
  const startTimeDate = new Date(startTz.getTime());
  const endTimeDate = new Date(endTz.getTime());
  const recurrenceEndDate = recurrenceEnd
    ? new Date(new TZDate(recurrenceEnd, timezone).getTime())
    : null;

  await db.event.update({
    where: { id: eventId },
    data: {
      title,
      description: description as Prisma.InputJsonValue,
      startTime: startTimeDate,
      endTime: endTimeDate,
      location: location || null,
      locationUrl: locationUrl || null,
      coverImage: coverImage || null,
      recurrence,
      recurrenceEnd: recurrenceEndDate,
    },
  });

  revalidatePath('/calendar');
  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${eventId}`);

  return { success: true };
}

export async function deleteEvent(eventId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return { error: 'Event not found' };
  }

  await db.event.delete({
    where: { id: eventId },
  });

  revalidatePath('/calendar');
  revalidatePath('/admin/events');

  return { success: true };
}

// Type for an event occurrence (recurring events appear multiple times)
export type EventOccurrence = {
  event: EventWithCreator;
  occurrenceDate: Date;
};

// Generate occurrences for recurring events within a date range
function getEventOccurrences(
  event: EventWithCreator,
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = [];
  const eventStart = new Date(event.startTime);

  // Non-recurring events: return single occurrence if within range
  if (event.recurrence === 'NONE') {
    if (isWithinInterval(eventStart, { start: rangeStart, end: rangeEnd })) {
      occurrences.push({ event, occurrenceDate: eventStart });
    }
    return occurrences;
  }

  // Recurring events: generate occurrences
  const recurrenceEnd = event.recurrenceEnd
    ? new Date(event.recurrenceEnd)
    : addMonths(rangeEnd, 12); // Default: 1 year out if no end date

  let currentDate = eventStart;

  while (
    isBefore(currentDate, rangeEnd) &&
    isBefore(currentDate, recurrenceEnd)
  ) {
    // Only include if occurrence is within the requested range
    if (
      (isAfter(currentDate, rangeStart) || currentDate.getTime() === rangeStart.getTime()) &&
      (isBefore(currentDate, rangeEnd) || currentDate.getTime() === rangeEnd.getTime())
    ) {
      occurrences.push({ event, occurrenceDate: new Date(currentDate) });
    }

    // Advance to next occurrence
    if (event.recurrence === 'WEEKLY') {
      currentDate = addWeeks(currentDate, 1);
    } else if (event.recurrence === 'MONTHLY') {
      currentDate = addMonths(currentDate, 1);
    } else {
      break;
    }
  }

  return occurrences;
}

// Get all event occurrences for a given month (including recurring)
export async function getEventsForMonth(
  year: number,
  month: number
): Promise<EventOccurrence[]> {
  await requireAuth();
  // month is 0-indexed (0 = January)
  const monthStart = startOfMonth(new Date(year, month, 1));
  const monthEnd = endOfMonth(monthStart);

  // Fetch all events that could have occurrences in this month:
  // 1. Events starting in this month
  // 2. Recurring events that started before this month (and haven't ended)
  const events = await db.event.findMany({
    where: {
      OR: [
        // Non-recurring events in this month
        {
          recurrence: 'NONE',
          startTime: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        // Recurring events that started before or during this month
        // and haven't ended before this month
        {
          recurrence: { in: ['WEEKLY', 'MONTHLY'] },
          startTime: { lte: monthEnd },
          OR: [
            { recurrenceEnd: null },
            { recurrenceEnd: { gte: monthStart } },
          ],
        },
      ],
    },
    orderBy: { startTime: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Generate all occurrences for the month
  const allOccurrences: EventOccurrence[] = [];

  for (const event of events) {
    const occurrences = getEventOccurrences(event, monthStart, monthEnd);
    allOccurrences.push(...occurrences);
  }

  // Sort by occurrence date
  allOccurrences.sort(
    (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
  );

  return allOccurrences;
}

// Get upcoming events for list view (next N days/months)
export async function getUpcomingEvents(
  daysAhead: number = 90
): Promise<EventOccurrence[]> {
  await requireAuth();
  const now = new Date();
  const rangeEnd = addMonths(now, Math.ceil(daysAhead / 30));

  // Fetch events
  const events = await db.event.findMany({
    where: {
      OR: [
        // Non-recurring events in range
        {
          recurrence: 'NONE',
          startTime: {
            gte: now,
            lte: rangeEnd,
          },
        },
        // Recurring events that could have occurrences
        {
          recurrence: { in: ['WEEKLY', 'MONTHLY'] },
          startTime: { lte: rangeEnd },
          OR: [
            { recurrenceEnd: null },
            { recurrenceEnd: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { startTime: 'asc' },
    include: {
      createdBy: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Generate occurrences
  const allOccurrences: EventOccurrence[] = [];

  for (const event of events) {
    const occurrences = getEventOccurrences(event, now, rangeEnd);
    allOccurrences.push(...occurrences);
  }

  // Sort by occurrence date
  allOccurrences.sort(
    (a, b) => a.occurrenceDate.getTime() - b.occurrenceDate.getTime()
  );

  return allOccurrences;
}
