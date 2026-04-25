/**
 * Round 5 / A1 — GDPR Attachment Orphan Sweep.
 *
 * Runs daily. Finds objects in the `dm-attachments` Supabase Storage bucket
 * that have no corresponding `Message.attachmentPath` row in the database and
 * deletes them. This prevents GDPR-problematic data accumulation from:
 *   - Failed or partially completed uploads
 *   - Retried sends that produced a second Storage object
 *   - Hypothetical future delete-message flows
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Any other
 * caller is rejected with 401. Without CRON_SECRET configured the route
 * refuses to run (Dealbreaker §11.4.1).
 *
 * Storage layout: each object lives at
 *   `{conversationId}/{uploadId}/{sanitisedFilename}`
 * The top-level folders are conversationId UUIDs. We list them, then list
 * each folder's contents, cross-reference with DB, and remove orphans.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import db from '@/lib/db';

const BUCKET = 'dm-attachments';
const LIST_LIMIT = 1000;
const DELETE_BATCH_SIZE = 100;

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
    const supabase = createAdminClient();

    // 1. Collect all attachment paths that are referenced by a Message row.
    const dbRows = await db.message.findMany({
      where: { attachmentPath: { not: null } },
      select: { attachmentPath: true },
    });
    const referencedPaths = new Set(dbRows.map((r) => r.attachmentPath!));

    // 2. List all objects in the bucket (two-level: folder → files).
    //    The bucket uses `{conversationId}/{uploadId}/{filename}` layout.
    const orphanedPaths: string[] = [];

    const { data: topLevel, error: topError } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: LIST_LIMIT });

    if (topError) {
      console.error('[Cron] dm-attachment-orphan-sweep: top-level list error', topError);
      return NextResponse.json({ ok: false, error: topError.message }, { status: 500 });
    }

    for (const folder of topLevel ?? []) {
      if (!folder.name) continue;
      // Each top-level entry is a conversationId directory.
      const { data: uploadFolders, error: folderError } = await supabase.storage
        .from(BUCKET)
        .list(folder.name, { limit: LIST_LIMIT });

      if (folderError) {
        console.warn('[Cron] dm-attachment-orphan-sweep: folder list error', folderError);
        continue;
      }

      for (const uploadFolder of uploadFolders ?? []) {
        if (!uploadFolder.name) continue;
        const uploadPrefix = `${folder.name}/${uploadFolder.name}`;

        const { data: files, error: fileError } = await supabase.storage
          .from(BUCKET)
          .list(uploadPrefix, { limit: LIST_LIMIT });

        if (fileError) {
          console.warn('[Cron] dm-attachment-orphan-sweep: file list error', fileError);
          continue;
        }

        for (const file of files ?? []) {
          if (!file.name || file.id === null) continue;
          const fullPath = `${uploadPrefix}/${file.name}`;
          if (!referencedPaths.has(fullPath)) {
            orphanedPaths.push(fullPath);
          }
        }
      }
    }

    // 3. Delete orphaned objects in batches.
    let deleted = 0;
    let errors = 0;

    for (let i = 0; i < orphanedPaths.length; i += DELETE_BATCH_SIZE) {
      const batch = orphanedPaths.slice(i, i + DELETE_BATCH_SIZE);
      const { error: deleteError } = await supabase.storage.from(BUCKET).remove(batch);
      if (deleteError) {
        console.error('[Cron] dm-attachment-orphan-sweep: delete error', deleteError);
        errors += batch.length;
      } else {
        deleted += batch.length;
      }
    }

    console.log(
      `[Cron] dm-attachment-orphan-sweep: scanned=${orphanedPaths.length + referencedPaths.size} orphans=${orphanedPaths.length} deleted=${deleted} errors=${errors}`,
    );

    return NextResponse.json({
      ok: errors === 0,
      orphansFound: orphanedPaths.length,
      deleted,
      errors,
    });
  } catch (error) {
    console.error('[Cron] dm-attachment-orphan-sweep failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Sweep failed' },
      { status: 500 },
    );
  }
}
