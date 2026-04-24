'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guards';
import db from '@/lib/db';
import { blockUserSchema } from '@/lib/validations/dm';

/**
 * Block a user from DMs. Idempotent via the `@@unique([blockerId, blockedId])`
 * constraint — we use `upsert` so double-clicks on the block button no-op.
 *
 * Semantics (brief §2.1):
 * - blocked user can no longer message the blocker
 * - the blocker no longer sees the conversation in their inbox
 * - history is not deleted (message rows remain)
 */
export async function blockUser(input: { targetUserId: string }) {
  const session = await requireAuth();
  const me = session.user.id;

  const parsed = blockUserSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid user id' as const };

  const target = parsed.data.targetUserId;
  if (target === me) return { error: 'Cannot block yourself' as const };

  await db.dmBlock.upsert({
    where: { blockerId_blockedId: { blockerId: me, blockedId: target } },
    create: { blockerId: me, blockedId: target },
    update: {},
  });

  revalidatePath('/messages');
  return { success: true as const };
}

export async function unblockUser(input: { targetUserId: string }) {
  const session = await requireAuth();
  const me = session.user.id;

  const parsed = blockUserSchema.safeParse(input);
  if (!parsed.success) return { error: 'Invalid user id' as const };

  const target = parsed.data.targetUserId;

  // `deleteMany` is tolerant of missing rows — idempotent unblock
  await db.dmBlock.deleteMany({
    where: { blockerId: me, blockedId: target },
  });

  revalidatePath('/messages');
  return { success: true as const };
}

/**
 * Returns the caller's outgoing block list. Used by the block-management UI.
 */
export async function getMyBlocks(): Promise<Array<{ id: string; name: string | null; image: string | null }>> {
  const session = await requireAuth();
  const me = session.user.id;

  const blocks = await db.dmBlock.findMany({
    where: { blockerId: me },
    select: {
      blocked: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return blocks.map((b) => b.blocked);
}

/**
 * Server-side check used by DM components to render the "blocked" banner.
 * Returns `{ iBlocked, theyBlocked }` so callers can render per-direction.
 */
export async function getBlockStatus(otherUserId: string) {
  const session = await requireAuth();
  const me = session.user.id;

  if (otherUserId === me) {
    return { iBlocked: false, theyBlocked: false };
  }

  const [iBlocked, theyBlocked] = await Promise.all([
    db.dmBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: me, blockedId: otherUserId } },
      select: { id: true },
    }),
    db.dmBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: otherUserId, blockedId: me } },
      select: { id: true },
    }),
  ]);

  return { iBlocked: !!iBlocked, theyBlocked: !!theyBlocked };
}
