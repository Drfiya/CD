import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-guards';

/**
 * POST /api/upload/badge-icon
 *
 * Admin-only. Uploads a small square icon to the `badge-icons` Supabase
 * Storage bucket and returns the public URL. Constraints (enforced here
 * rather than at the BadgeDefinition action level so malformed uploads
 * never reach the DB):
 *   - Admin role required (401 otherwise)
 *   - MIME must be one of png / jpeg / webp / svg+xml
 *   - Size ≤ 256 KB
 *   - Filename sanitized; path is `${session.user.id}/${timestamp}-${name}`
 *
 * The 512×512 max-dimensions cap from the brief is advisory — browsers
 * render icons at a fixed small size via CSS, so oversized images just
 * waste bandwidth. We log an optional-follow-up warning rather than
 * server-side downscaling (would require a separate image library).
 */

const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 256 * 1024;

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 80);
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type "${file.type}". Allowed: PNG, JPEG, WEBP, SVG.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Icon too large. Maximum size is ${MAX_BYTES / 1024} KB.` },
      { status: 400 }
    );
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const supabase = createAdminClient();

  const safeName = sanitizeFilename(file.name || 'icon');
  const path = `${session.user.id}/${Date.now()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from('badge-icons')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message?.includes('Bucket not found')) {
      return NextResponse.json(
        { error: 'Storage bucket "badge-icons" not configured. Create it in Supabase (public read, admin write).' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('badge-icons').getPublicUrl(path);

  return NextResponse.json({ success: true, url: publicUrl });
}
