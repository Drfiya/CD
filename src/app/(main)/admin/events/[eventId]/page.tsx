import { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getEvent } from '@/lib/event-actions';
import { EventForm } from '@/components/admin/event-form';

export const metadata: Metadata = {
  title: 'Edit Event | Admin',
};

interface EventEditPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function EventEditPage({ params }: EventEditPageProps) {
  const { eventId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/moderation');
  }

  const isNew = eventId === 'new';
  let event = null;

  if (!isNew) {
    event = await getEvent(eventId);
    if (!event) {
      notFound();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link */}
      <Link
        href="/admin/events"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Events
      </Link>

      <div>
        <h1 className="text-3xl font-bold">{isNew ? 'Create Event' : 'Edit Event'}</h1>
        <p className="text-muted-foreground mt-1">
          {isNew ? 'Add a new event to the calendar' : 'Update event details'}
        </p>
      </div>

      {/* Event form */}
      <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6">
        <EventForm event={event || undefined} />
      </div>
    </div>
  );
}
