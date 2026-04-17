import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/gamification/level-badge';
import { PointsDisplay } from '@/components/gamification/points-display';
import { UGCText } from '@/components/translation/UGCText';

interface MemberProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MemberProfilePageProps) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: user?.name ? `${user.name}'s Profile` : 'Member Profile',
  };
}

export default async function MemberProfilePage({ params }: MemberProfilePageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      bio: true,
      image: true,
      createdAt: true,
      level: true,
      points: true,
    },
  });

  if (!user) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === user.id;
  const memberSince = user.createdAt.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <Avatar src={user.image} name={user.name} size="lg" />
        </div>

        <div className="flex items-center justify-center gap-3 mb-2">
          <h1 className="text-2xl font-bold">
            {user.name || 'Anonymous'}
          </h1>
          <LevelBadge level={user.level} size="md" />
        </div>

        <UGCText as="p" className="text-muted-foreground mb-6">
          {user.bio || 'No bio yet'}
        </UGCText>

        {/* Gamification stats */}
        <div className="border rounded-lg p-4 mb-6 max-w-xs mx-auto">
          <h3 className="font-medium mb-3">Progress</h3>
          <PointsDisplay points={user.points} level={user.level} />
        </div>

        <p className="text-sm text-muted-foreground">
          Member since {memberSince}
        </p>

        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="inline-block mt-6 text-blue-600 hover:text-blue-800 text-sm"
          >
            Edit Profile
          </Link>
        )}
      </div>
    </div>
  );
}
