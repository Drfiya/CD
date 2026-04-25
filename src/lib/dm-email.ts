'use server';

/**
 * Round 6 / B2 — E-Mail-Fallback für offline DM-Empfänger.
 *
 * Fires a single notification email to the recipient when they receive a DM,
 * subject to two guards:
 *   1. `user.emailNotifications` must be true (respects user preference).
 *   2. Redis debounce: max one email per (conversationId, recipientId) per hour.
 *      Prevents spam when the recipient stays offline for extended periods.
 *
 * Called fire-and-forget from `sendMessage` — never blocks the sender's UI.
 * The caller catches all errors internally; failures are logged but swallowed.
 *
 * Infrastructure re-used from this project (no new NPM deps):
 *   - `resend` package (already in package.json)
 *   - `@upstash/redis` (already in package.json via @upstash/ratelimit)
 *   - `@/lib/db` (Prisma client)
 */

import { Resend } from 'resend';
import db from '@/lib/db';

// One email per conversation per recipient per hour.
const DM_EMAIL_DEBOUNCE_TTL_SEC = 3600;
const REDIS_KEY_PREFIX = 'dm:email:debounce';

// Lazy Redis — only initialised when UPSTASH_REDIS_REST_URL is configured.
// Returns null in dev/test environments where Upstash is not available.
async function tryGetRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  try {
    const { Redis } = await import('@upstash/redis');
    return new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch {
    return null;
  }
}

// Lazy Resend — only initialised when RESEND_API_KEY is set.
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Send a DM notification email to the recipient. Fire-and-forget — all
 * errors are caught internally so callers never need to await this.
 *
 * Guards applied (in order):
 *  1. Redis debounce: skip if a key `dm:email:debounce:{convId}:{recipientId}`
 *     exists in Upstash (TTL = 1 hour).
 *  2. User preference: skip if `user.emailNotifications` is false.
 *  3. Dev-mode: console.log when RESEND_API_KEY is absent or set to the
 *     placeholder value — so the rest of the logic is exercised in dev.
 */
export async function sendDmEmailNotification({
  conversationId,
  recipientId,
  senderName,
  messagePreview,
}: {
  conversationId: string;
  recipientId: string;
  senderName: string | null;
  messagePreview: string;
}): Promise<void> {
  try {
    const debounceKey = `${REDIS_KEY_PREFIX}:${conversationId}:${recipientId}`;

    // 1. Redis debounce check — skip if email was already sent within the hour.
    const redis = await tryGetRedis();
    if (redis) {
      const existing = await redis.get(debounceKey);
      if (existing) return;
    }

    // 2. Fetch recipient and check emailNotifications preference.
    const recipient = await db.user.findUnique({
      where: { id: recipientId },
      select: { email: true, emailNotifications: true },
    });
    if (!recipient?.emailNotifications) return;

    const sender = senderName || 'Someone';
    const safeSender = escapeHtml(sender);
    // Truncate preview to avoid leaking long messages into email subjects.
    const preview =
      messagePreview.length > 120
        ? messagePreview.slice(0, 117) + '…'
        : messagePreview;
    const safePreview = escapeHtml(preview);
    const messagesUrl = `${process.env.NEXTAUTH_URL ?? ''}/messages/${conversationId}`;

    // 3. Dev-mode fallback — no real send, no Redis write.
    const isDev =
      !process.env.RESEND_API_KEY ||
      process.env.RESEND_API_KEY === 're_your_api_key_here';

    if (isDev) {
      console.log(
        `[DM Email] Dev-mode. Would send to ${recipient.email}: "${sender}: ${preview}"`,
      );
      // Still set debounce in Redis if available, to match production behaviour.
      if (redis) await redis.set(debounceKey, '1', { ex: DM_EMAIL_DEBOUNCE_TTL_SEC });
      return;
    }

    // 4. Production: send via Resend.
    const resend = getResendClient();
    if (!resend) return;

    await resend.emails.send({
      from: process.env.DM_EMAIL_FROM ?? 'Community <onboarding@resend.dev>',
      to: recipient.email,
      subject: `New message from ${sender}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <p style="font-size: 16px; margin-bottom: 8px;">
            <strong>${safeSender}</strong> sent you a message:
          </p>
          <blockquote style="
            border-left: 3px solid #D94A4A;
            margin: 0 0 24px 0;
            padding: 8px 16px;
            background: #f9f9f9;
            font-size: 14px;
            color: #555;
            border-radius: 0 4px 4px 0;
          ">
            ${safePreview}
          </blockquote>
          <p style="margin-bottom: 24px;">
            <a
              href="${messagesUrl}"
              style="
                background: #D94A4A;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
              "
            >
              Reply in ScienceExperts.ai
            </a>
          </p>
          <p style="color: #999; font-size: 12px;">
            To stop receiving these emails, update your notification settings in your profile.
          </p>
        </div>
      `,
    });

    // 5. Set debounce key — prevents another email for this conversation for 1 hour.
    if (redis) await redis.set(debounceKey, '1', { ex: DM_EMAIL_DEBOUNCE_TTL_SEC });
  } catch (err) {
    // Never propagate — this is fire-and-forget. Sender's UI must not be affected.
    console.error('[DM Email] sendDmEmailNotification failed (non-fatal):', err);
  }
}
