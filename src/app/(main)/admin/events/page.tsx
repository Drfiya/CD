import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import { getEvents } from '@/lib/event-actions';
import { EventCard } from '@/components/admin/event-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Event Management | Admin',
};

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Requires admin+ role (layout handles moderator+ check)
  if (!canEditSettings(session.user.role)) {
    redirect('/admin/moderation');
  }

  const events = await getEvents();

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Event Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage calendar events
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">Create Event</Link>
        </Button>
      </div>

      {/* Event list */}
      <div>
        {events.length === 0 ? (
          <EmptyState
            title="No events yet"
            description="Create your first event to get started with the calendar."
            action={
              <Button asChild>
                <Link href="/admin/events/new">Create Event</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
