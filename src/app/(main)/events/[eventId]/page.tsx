import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getEvent } from '@/lib/event-actions';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';
import { UGCText } from '@/components/translation/UGCText';
import { EventContent } from './event-content';

interface PageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const [event, userLanguage] = await Promise.all([
    getEvent(eventId),
    getUserLanguage(),
  ]);
  const messages = getMessages(userLanguage);

  if (!event) {
    notFound();
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back link */}
      <Link
        href="/calendar"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        {messages.eventsPage.backToCalendar}
      </Link>

      {/* Cover image */}
      {event.coverImage && (
        <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={event.coverImage}
            alt={event.title}
            fill
            unoptimized
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Title and badges */}
      <div className="flex items-start gap-3">
        <h1 className="text-3xl font-bold flex-1"><UGCText as="span">{event.title}</UGCText></h1>
        {event.recurrence !== 'NONE' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
            {event.recurrence === 'WEEKLY' ? messages.eventsPage.weeklyEvent : messages.eventsPage.monthlyEvent}
          </span>
        )}
      </div>

      {/* Event client content (handles timezone display) */}
      <EventContent event={event} messages={messages.eventsPage} />
    </div>
  );
}
