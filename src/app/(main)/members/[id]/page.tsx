import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import { Avatar } from '@/components/ui/avatar';
import { LevelBadge } from '@/components/gamification/level-badge';
import { PointsDisplay } from '@/components/gamification/points-display';
import { BadgeDisplay } from '@/components/gamification/badge-display';
import { UGCText } from '@/components/translation/UGCText';
import { getMessages } from '@/lib/i18n';
import { getUserLanguage } from '@/lib/translation/helpers';

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

  // Fail-open language resolution — never crash the profile page if the lang resolver throws
  let userLanguage: string;
  try {
    userLanguage = await getUserLanguage();
  } catch (err) {
    console.error('[MemberProfile] getUserLanguage failed, defaulting to en:', err);
    userLanguage = 'en';
  }
  const messages = getMessages(userLanguage);

  const [user, completedLessons] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        bio: true,
        image: true,
        createdAt: true,
        level: true,
        points: true,
        badges: {
          select: { type: true, customDefinitionId: true, earnedAt: true },
          orderBy: { earnedAt: 'asc' },
        },
        _count: {
          select: {
            posts: true,
            comments: true,
            enrollments: true,
          },
        },
      },
    }),
    // LessonProgress rows are only created on completion — count = completed count
    db.lessonProgress.count({ where: { userId: id } }),
  ]);

  if (!user) {
    notFound();
  }

  const isOwnProfile = session?.user?.id === user.id;
  const memberSince = user.createdAt.toLocaleDateString(userLanguage === 'de' ? 'de-DE' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const enrollmentLabel = user._count.enrollments > 0
    ? (user._count.enrollments === 1
        ? messages.profilePage.enrolledCoursesOne
        : messages.profilePage.enrolledCoursesMany.replace('{count}', String(user._count.enrollments)))
      + (completedLessons > 0
        ? (completedLessons === 1
            ? messages.profilePage.lessonsCompletedSuffixOne
            : messages.profilePage.lessonsCompletedSuffixMany.replace('{count}', String(completedLessons)))
        : '')
    : null;

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

        {/* Activity stats — posts, comments, lessons completed */}
        <div className="grid grid-cols-3 gap-3 mb-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-xl font-semibold text-foreground">{user._count.posts}</div>
            <div className="text-xs text-muted-foreground">{messages.profilePage.posts}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-foreground">{user._count.comments}</div>
            <div className="text-xs text-muted-foreground">{messages.profilePage.comments}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-foreground">{completedLessons}</div>
            <div className="text-xs text-muted-foreground">{messages.profilePage.lessonsCompleted}</div>
          </div>
        </div>

        {enrollmentLabel && (
          <p className="text-sm text-muted-foreground mb-4">{enrollmentLabel}</p>
        )}

        {/* Gamification stats */}
        <div className="border rounded-lg p-4 mb-6 max-w-xs mx-auto">
          <h3 className="font-medium mb-3">{messages.gamification.progress}</h3>
          <PointsDisplay points={user.points} level={user.level} messages={messages} />
        </div>

        {/* Earned badges (full list with labels) */}
        {user.badges.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-3 text-sm text-muted-foreground">{messages.gamification.badges}</h3>
            <div className="flex justify-center">
              <BadgeDisplay badges={user.badges} variant="detailed" />
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {messages.profilePage.memberSince.replace('{date}', memberSince)}
        </p>

        {isOwnProfile && (
          <Link
            href="/profile/edit"
            className="inline-block mt-6 text-blue-600 hover:text-blue-800 text-sm"
          >
            {messages.auth.editProfile}
          </Link>
        )}
      </div>
    </div>
  );
}
