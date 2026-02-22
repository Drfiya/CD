import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LevelBadge } from '@/components/gamification/level-badge';

interface MemberCardProps {
  member: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    level: number;
  };
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function truncateBio(bio: string | null, maxLength: number = 100): string {
  if (!bio) return '';
  if (bio.length <= maxLength) return bio;
  return bio.slice(0, maxLength).trim() + '...';
}

export function MemberCard({ member }: MemberCardProps) {
  const initials = getInitials(member.name);
  const truncatedBio = truncateBio(member.bio);

  return (
    <Link
      href={`/members/${member.id}`}
      className={cn(
        'block border border-border rounded-lg p-4',
        'hover:shadow-md transition-shadow',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-12 w-12 flex-shrink-0">
          {member.image ? (
            <Image
              src={member.image}
              alt={member.name || 'Member'}
              fill
              unoptimized
              className="rounded-full object-cover"
              sizes="48px"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate">
              {member.name || 'Anonymous'}
            </p>
            <LevelBadge level={member.level} size="sm" />
          </div>
          {truncatedBio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {truncatedBio}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
