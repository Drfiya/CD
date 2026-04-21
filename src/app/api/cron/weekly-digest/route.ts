/**
 * Vercel Cron entry point for the weekly digest (B2).
 *
 * Schedule: every Monday 14:00 UTC (`0 14 * * 1`) — see vercel.json.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Any other
 * caller (manual curl, attacker, scanner) is rejected with 401. Without a
 * configured `CRON_SECRET` env var, the route refuses to run — this prevents
 * accidental email blasts in misconfigured environments.
 */

import { NextRequest, NextResponse } from 'next/server';
import { runWeeklyDigestBatch } from '@/lib/digest-actions-internal';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 503 },
    );
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runWeeklyDigestBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[Cron] weekly-digest failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Digest batch failed' },
      { status: 500 },
    );
  }
}
