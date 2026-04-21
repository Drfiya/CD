'use server';

import { revalidatePath } from 'next/cache';
import db from '@/lib/db';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth, requireAdmin } from '@/lib/auth-guards';

// Allowed file types for attachments
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Sanitize filename to remove unsafe characters
 */
function sanitizeFilename(filename: string): string {
  // Remove path traversal characters and other unsafe chars
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 100); // Limit length
}

export async function getAttachments(lessonId: string) {
  await requireAuth();
  const attachments = await db.attachment.findMany({
    where: { lessonId },
    orderBy: { createdAt: 'asc' },
  });

  return attachments;
}

export async function uploadAttachment(formData: FormData) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const file = formData.get('file') as File | null;
  const lessonId = formData.get('lessonId') as string | null;

  if (!file) {
    return { error: 'No file provided' };
  }

  if (!lessonId) {
    return { error: 'No lesson ID provided' };
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      error: `File type not allowed. Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT, MD`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File too large. Maximum size is 10MB' };
  }

  // Verify lesson exists
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: true },
  });

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  const supabase = createAdminClient();

  // Build storage path
  const sanitizedName = sanitizeFilename(file.name);
  const path = `lessons/${lessonId}/${Date.now()}-${sanitizedName}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(path, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    // Check if bucket doesn't exist
    if (uploadError.message?.includes('Bucket not found')) {
      return {
        error:
          'Storage bucket "attachments" not configured. Please create it in Supabase Storage.',
      };
    }
    return { error: `Upload failed: ${uploadError.message}` };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('attachments').getPublicUrl(path);

  // Create attachment record
  const attachment = await db.attachment.create({
    data: {
      name: file.name, // Original filename for display
      url: publicUrl,
      size: file.size,
      mimeType: file.type,
      lessonId,
    },
  });

  revalidatePath(`/admin/courses/${lesson.module.courseId}/lessons/${lessonId}`);

  return { success: true, attachment };
}

export async function deleteAttachment(attachmentId: string) {
  try {
    await requireAdmin();
  } catch {
    return { error: 'Not authorized - admin role required' };
  }

  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: {
      lesson: {
        include: { module: true },
      },
    },
  });

  if (!attachment) {
    return { error: 'Attachment not found' };
  }

  const supabase = createAdminClient();

  // Extract path from URL
  // URL format: https://<project>.supabase.co/storage/v1/object/public/attachments/lessons/<lessonId>/<filename>
  const match = attachment.url.match(/\/attachments\/(.+)$/);
  const path = match ? match[1] : null;

  // Delete from storage (ignore errors - file might already be deleted)
  if (path) {
    await supabase.storage.from('attachments').remove([path]);
  }

  // Delete database record
  await db.attachment.delete({
    where: { id: attachmentId },
  });

  revalidatePath(
    `/admin/courses/${attachment.lesson.module.courseId}/lessons/${attachment.lessonId}`
  );

  return { success: true };
}
