'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface MediaUpload {
    type: 'image';
    url: string;
}

export async function uploadPostMedia(formData: FormData): Promise<{ success: true; media: MediaUpload } | { error: string }> {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return { error: 'Not authenticated' };
    }

    const file = formData.get('file') as File | null;

    if (!file) {
        return { error: 'No file provided' };
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return { error: 'Invalid file type. Supported: JPEG, PNG, GIF, WebP' };
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
        return { error: 'File too large. Maximum size is 5MB' };
    }

    const supabase = createAdminClient();

    // Build storage path
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `${session.user.id}/${Date.now()}.${ext}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filename, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
        });

    if (uploadError) {
        console.error('Upload error:', uploadError);
        if (uploadError.message?.includes('Bucket not found')) {
            return { error: 'Storage bucket "post-media" not configured. Please create it in Supabase Storage.' };
        }
        return { error: `Upload failed: ${uploadError.message}` };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filename);

    return {
        success: true,
        media: {
            type: 'image',
            url: publicUrl,
        },
    };
}
