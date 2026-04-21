import Link from 'next/link';
import Image from 'next/image';
import { LevelBadge } from '@/components/gamification/level-badge';
import { BADGE_CONFIG } from '@/components/gamification/badge-config';
import { UGCText } from '@/components/translation/UGCText';
import type { BadgeType } from '@/generated/prisma/client';

interface MemberCardProps {
  member: {
    id: string;
    name: string | null;
    image: string | null;
    bio: string | null;
    level: number;
    points: number;
    badges?: { type: BadgeType | null; customDefinitionId?: string | null }[];
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

export function MemberCard({ member }: MemberCardProps) {
  const initials = getInitials(member.name);

  return (
    <Link
      href={`/members/${member.id}`}
      className="block bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700 rounded-xl p-5 hover:shadow-md dark:hover:border-neutral-500 transition-all group"
    >
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative w-16 h-16 mb-3">
          {member.image ? (
            <Image
              src={member.image}
              alt={member.name || 'Member'}
              fill
              unoptimized
              className="rounded-full object-cover ring-2 ring-gray-100 dark:ring-neutral-600 group-hover:ring-gray-200 dark:group-hover:ring-neutral-500 transition-all"
              sizes="64px"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-700 ring-2 ring-gray-100 dark:ring-neutral-600 flex items-center justify-center text-lg font-semibold text-gray-500 dark:text-neutral-300">
              {initials}
            </div>
          )}
        </div>

        {/* Name */}
        <p className="font-semibold text-gray-900 dark:text-neutral-100 truncate w-full group-hover:text-[#D94A4A] transition-colors">
          {member.name || 'Anonymous'}
        </p>

        {/* Level + Points */}
        <div className="flex items-center gap-2 mt-1.5">
          <LevelBadge level={member.level} size="sm" />
          <span className="text-xs text-gray-500 dark:text-neutral-400">
            {member.points} pts
          </span>
        </div>

        {/* Earned badges — fast path uses static config.
            Custom admin-authored badges (type=null) are summarized with a
            sparkle placeholder; the detailed profile page renders them fully. */}
        {member.badges && member.badges.length > 0 && (
          <div
            className="inline-flex items-center gap-1 mt-2"
            aria-label={`${member.badges.length} earned badge${member.badges.length === 1 ? '' : 's'}`}
          >
            {member.badges.slice(0, 3).map((b, idx) =>
              b.type ? (
                <span
                  key={`${b.type}-${idx}`}
                  title={BADGE_CONFIG[b.type].label}
                  aria-label={BADGE_CONFIG[b.type].label}
                  className="text-base leading-none"
                >
                  {BADGE_CONFIG[b.type].emoji}
                </span>
              ) : (
                <span
                  key={`custom-${b.customDefinitionId ?? idx}`}
                  title="Custom badge"
                  aria-label="Custom badge"
                  className="text-base leading-none"
                >
                  ✨
                </span>
              )
            )}
            {member.badges.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-neutral-400">
                +{member.badges.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {member.bio && (
          <UGCText as="p" className="text-xs text-gray-500 dark:text-neutral-400 mt-2 line-clamp-2 leading-relaxed">
            {member.bio}
          </UGCText>
        )}
      </div>
    </Link>
  );
}
