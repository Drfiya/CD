import type { Post, User, BadgeType } from '@/generated/prisma/client';

export type VideoService = 'youtube' | 'vimeo' | 'loom';

export interface VideoEmbed {
  service: VideoService;
  id: string;
  url: string;
  thumbnailUrl?: string;
}

export type PostWithAuthor = Post & {
  author: Pick<User, 'id' | 'name' | 'image' | 'level' | 'role'> & {
    badges?: { type: BadgeType | null; customDefinitionId?: string | null }[];
    _count?: { badges: number };
  };
};
