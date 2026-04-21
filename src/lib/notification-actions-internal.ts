import db from '@/lib/db';
import { sendActivityEmail } from '@/lib/email';

/**
 * Internal notification creation routine.
 *
 * This file deliberately does NOT carry `'use server'` — which means it is
 * module-level server code and is NOT reachable as a Next.js server-action
 * endpoint. Only code running inside the Node runtime can import and call it.
 *
 * If this were `'use server'`, any authenticated client could POST arbitrary
 * parameters (recipientId, actorId, actorName, postId, commentId) and forge
 * notifications / email spam bypassing the no-self-notify and 20-mention
 * invariants enforced at the caller sites. Moving it to an internal module
 * closes that RPC endpoint entirely — the function is only reachable via
 * server-side imports that already run inside vetted action code.
 *
 * Mirrors the hardening pattern applied to `checkAndAwardBadgesInternal`.
 */
export async function createActivityNotification({
  type,
  recipientId,
  actorId,
  actorName,
  postId,
  commentId,
}: {
  type: 'COMMENT' | 'LIKE' | 'MENTION';
  recipientId: string;
  actorId: string;
  actorName?: string | null;
  postId?: string | null;
  commentId?: string | null;
}) {
  try {
    await db.notification.create({
      data: { type, recipientId, actorId, postId, commentId },
    });
    // Fire-and-forget — email errors must not block the main action
    sendActivityEmail({ recipientId, type, actorName, postId }).catch(() => {});
  } catch {
    // Notification is non-critical; never block the main action
  }
}
