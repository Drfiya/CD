import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { canEditSettings } from '@/lib/permissions';
import db from '@/lib/db';
import { BadgeDesigner } from '@/components/admin/badge-designer';

export const metadata: Metadata = {
  title: 'Badge Designer | Admin',
};

export default async function AdminBadgesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  if (!canEditSettings(session.user.role)) {
    redirect('/admin/posts');
  }

  const definitions = await db.badgeDefinition.findMany({
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    select: {
      id: true,
      key: true,
      type: true,
      label: true,
      description: true,
      emoji: true,
      iconUrl: true,
      colorHex: true,
      condition: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { badges: true } },
    },
  });

  // Pool of users to choose from when manually granting a custom badge.
  // Kept modest (top 50 by points) to avoid paying a full member scan.
  const members = await db.user.findMany({
    orderBy: [{ points: 'desc' }, { name: 'asc' }],
    take: 50,
    select: { id: true, name: true, email: true, image: true },
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-neutral-100">Badge Designer</h1>
        <p className="text-muted-foreground mt-1">
          Edit icons, colors, and labels for every badge — or create new custom badges to grant manually.
        </p>
      </div>
      <BadgeDesigner definitions={definitions} members={members} />
    </div>
  );
}
