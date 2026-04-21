/**
 * Internal weekly digest sender.
 *
 * NOT a `'use server'` module — every export here trusts caller-supplied
 * `userId` arguments and must only be reachable from server code (the cron
 * route, scripts, etc.). See `directives/common_issues.md` → Module
 * Architecture for the rationale and other examples in this codebase
 * (`badge-actions-internal.ts`, `notification-actions-internal.ts`,
 * `streak-actions-internal.ts`, `activation-actions-internal.ts`).
 */

import { Resend } from 'resend';
import db from '@/lib/db';
import { trackResendEmail } from '@/lib/api-tracking';

// Same escaping helper as `email.ts`. Re-implemented here rather than
// imported to keep this module independent of `email.ts` (which currently
// re-exports nothing useful for digests).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export interface WeeklyDigestPayload {
  topPosts: { id: string; title: string | null; likeCount: number; commentCount: number }[];
  newBadgeCount: number;
  currentStreak: number;
  freezeTokens: number;
}

const SEVEN_DAYS_MS = 7 * 86_400_000;
const SIX_DAYS_MS = 6 * 86_400_000;

/**
 * Build the digest payload for a single user. Pure read — no DB writes.
 * Exposed so tests can validate shape without invoking Resend.
 */
export async function buildWeeklyDigest(userId: string): Promise<WeeklyDigestPayload | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      freezeTokens: true,
      _count: { select: { badges: true } },
    },
  });
  if (!user) return null;

  const since = new Date(Date.now() - SEVEN_DAYS_MS);

  const topPostsRaw = await db.post.findMany({
    where: { createdAt: { gte: since } },
    orderBy: [{ likes: { _count: 'desc' } }, { comments: { _count: 'desc' } }],
    take: 5,
    select: {
      id: true,
      title: true,
      _count: { select: { likes: true, comments: true } },
    },
  });

  const topPosts = topPostsRaw.map((p) => ({
    id: p.id,
    title: p.title,
    likeCount: p._count.likes,
    commentCount: p._count.comments,
  }));

  return {
    topPosts,
    newBadgeCount: user._count.badges,
    currentStreak: user.currentStreak,
    freezeTokens: user.freezeTokens,
  };
}

/**
 * Send the weekly digest email to one user. Idempotent within a week:
 * skips silently if `lastEmailDigestAt` is < 6 days ago. Updates
 * `lastEmailDigestAt` after a successful (or dev-mode logged) send.
 *
 * Errors are caught locally so a single failure can't poison a batch run.
 */
export async function sendWeeklyDigestToUser(
  userId: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const recipient = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        emailNotifications: true,
        lastEmailDigestAt: true,
      },
    });
    if (!recipient) return { sent: false, reason: 'not-found' };
    if (!recipient.emailNotifications) return { sent: false, reason: 'opted-out' };
    if (
      recipient.lastEmailDigestAt &&
      Date.now() - recipient.lastEmailDigestAt.getTime() < SIX_DAYS_MS
    ) {
      return { sent: false, reason: 'already-sent-this-week' };
    }

    const payload = await buildWeeklyDigest(userId);
    if (!payload) return { sent: false, reason: 'payload-empty' };

    const baseUrl = process.env.NEXTAUTH_URL ?? '';
    const safeName = escapeHtml(recipient.name ?? 'there');

    const postsHtml = payload.topPosts.length
      ? payload.topPosts
          .map((p) => {
            const safeTitle = escapeHtml(p.title ?? 'Untitled post');
            return `<li style="margin: 8px 0;"><a href="${baseUrl}/feed/${p.id}" style="color: #0070f3; text-decoration: none;">${safeTitle}</a> <span style="color: #999; font-size: 12px;">(${p.likeCount} likes · ${p.commentCount} comments)</span></li>`;
          })
          .join('')
      : '<li style="color: #999;">No new posts this week — be the first to share something!</li>';

    const subject = 'Your weekly community digest';

    const body = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937;">Hi ${safeName}, here's your week</h1>
        <h2 style="color: #1f2937; font-size: 16px; margin-top: 24px;">Top posts this week</h2>
        <ul style="padding-left: 20px;">${postsHtml}</ul>
        <p style="color: #1f2937; margin-top: 24px;">
          <strong>Streak:</strong> ${payload.currentStreak} day${payload.currentStreak === 1 ? '' : 's'}
          ${payload.freezeTokens > 0 ? ` · <strong>Freeze tokens:</strong> ${payload.freezeTokens}` : ''}
        </p>
        <p style="color: #1f2937;">
          <strong>Badges earned:</strong> ${payload.newBadgeCount}
        </p>
        <p style="margin: 24px 0;">
          <a href="${baseUrl}/feed" style="background: #D94A4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Open the community</a>
        </p>
        <p style="color: #999; font-size: 12px;">
          To stop receiving these emails, turn off notifications in your profile settings.
        </p>
      </div>
    `;

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_your_api_key_here') {
      console.log(`[Digest] (dev) would send digest to ${recipient.email}: ${subject}`);
    } else {
      const resend = getResendClient();
      if (resend) {
        await resend.emails.send({
          from: 'Community <onboarding@resend.dev>',
          to: recipient.email,
          subject,
          html: body,
        });
        trackResendEmail(recipient.email);
      }
    }

    await db.user.update({
      where: { id: userId },
      data: { lastEmailDigestAt: new Date() },
    });

    return { sent: true };
  } catch (error) {
    console.error('[Digest] Failed to send digest:', error);
    return { sent: false, reason: 'error' };
  }
}

/**
 * Iterate all opted-in users that are eligible for a digest this week.
 * Returns counters for observability. Designed to be called by the
 * Vercel cron route handler.
 */
export async function runWeeklyDigestBatch(): Promise<{
  attempted: number;
  sent: number;
  skipped: number;
}> {
  const cutoff = new Date(Date.now() - SIX_DAYS_MS);
  const candidates = await db.user.findMany({
    where: {
      emailNotifications: true,
      OR: [
        { lastEmailDigestAt: null },
        { lastEmailDigestAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
  });

  let sent = 0;
  let skipped = 0;
  for (const u of candidates) {
    const result = await sendWeeklyDigestToUser(u.id);
    if (result.sent) sent += 1;
    else skipped += 1;
  }

  return { attempted: candidates.length, sent, skipped };
}

// Exported for unit tests
export const __test__ = { SEVEN_DAYS_MS, SIX_DAYS_MS };
