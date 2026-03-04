'use server';

/**
 * File upload action for Dev Tracker resources.
 * Uploads files to Supabase Storage and creates a DevTrackerResource record.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Admin client is imported dynamically in upload functions
import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

// --- Allowed types ---

const ALLOWED_MIME_TYPES = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    // Media
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    // Archives
    'application/zip',
    'application/x-zip-compressed',
    'application/gzip',
];

// 50MB limit — generous for video/audio files
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// --- Helpers ---

function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .substring(0, 100);
}

/** Human-readable file size */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Get a category label for a MIME type */
function getFileCategory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'Image';
    if (mimeType.startsWith('video/')) return 'Video';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'Spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'Presentation';
    if (mimeType.startsWith('text/')) return 'Text';
    if (mimeType.includes('zip') || mimeType.includes('gzip')) return 'Archive';
    return 'File';
}

/** Get file extension from name */
function getExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

// --- Upload action ---

export async function uploadResourceFile(formData: FormData): Promise<{
    success?: true;
    resource?: { id: string; title: string; fileUrl: string };
    error?: string;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { error: 'Not authenticated' };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return { error: 'No file provided' };
    }

    // Validate type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return {
            error: `File type "${file.type}" not supported. Supported: images, PDFs, documents, video, audio, archives.`,
        };
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
        return { error: `File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.` };
    }

    // Use admin client to bypass RLS (NextAuth doesn't create Supabase sessions)
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    // Build storage path: dev-resources/<userId>/<timestamp>-<filename>
    const sanitizedName = sanitizeFilename(file.name);
    const path = `${session.user.id}/${Date.now()}-${sanitizedName}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage
        .from('dev-resources')
        .upload(path, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        console.error('Dev resource upload error:', uploadError);
        if (uploadError.message?.includes('Bucket not found')) {
            return {
                error: 'Storage bucket "dev-resources" not configured. Please create it in Supabase Storage.',
            };
        }
        return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from('dev-resources').getPublicUrl(path);

    // Create DB record — use filename as title, category as content
    const title = file.name;
    const category = getFileCategory(file.type);

    const resource = await db.devTrackerResource.create({
        data: {
            type: 'FILE',
            title,
            content: category, // Stores the category label as content for FILE type
            fileUrl: publicUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            createdById: session.user.id,
        },
    });

    revalidatePath('/admin/dev-tracker/resources');

    return {
        success: true,
        resource: { id: resource.id, title: resource.title, fileUrl: publicUrl },
    };
}

/** Upload multiple files at once */
export async function uploadResourceFiles(formData: FormData): Promise<{
    results: Array<{ fileName: string; success: boolean; error?: string }>;
}> {
    const files = formData.getAll('files') as File[];
    const results: Array<{ fileName: string; success: boolean; error?: string }> = [];

    for (const file of files) {
        const singleForm = new FormData();
        singleForm.set('file', file);
        const result = await uploadResourceFile(singleForm);
        results.push({
            fileName: file.name,
            success: !!result.success,
            error: result.error,
        });
    }

    return { results };
}

// --- Media image upload for resource attachments ---

const MEDIA_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

/** Upload multiple images as resource media attachments. Returns URLs for storage in the media JSON field. */
export async function uploadResourceMedia(formData: FormData): Promise<{
    results: Array<{ url: string; filename: string; success: boolean; error?: string }>;
}> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return { results: [{ url: '', filename: '', success: false, error: 'Not authenticated' }] };
    }

    const files = formData.getAll('media') as File[];
    const results: Array<{ url: string; filename: string; success: boolean; error?: string }> = [];

    // Use admin client to bypass RLS policies (NextAuth doesn't create Supabase sessions)
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminClient();

    for (const file of files) {
        // Validate type
        if (!MEDIA_IMAGE_TYPES.includes(file.type)) {
            results.push({ url: '', filename: file.name, success: false, error: `Unsupported type: ${file.type}` });
            continue;
        }

        // Validate size
        if (file.size > MAX_MEDIA_SIZE) {
            results.push({ url: '', filename: file.name, success: false, error: `File too large (max 10MB)` });
            continue;
        }

        const sanitizedName = sanitizeFilename(file.name);
        // Use userId/ prefix to match bucket path expectations
        const path = `${session.user.id}/media-${Date.now()}-${sanitizedName}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from('dev-resources')
            .upload(path, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Media upload error:', uploadError);
            results.push({ url: '', filename: file.name, success: false, error: uploadError.message });
            continue;
        }

        const { data: { publicUrl } } = supabase.storage.from('dev-resources').getPublicUrl(path);

        results.push({ url: publicUrl, filename: file.name, success: true });
    }

    return { results };
}

