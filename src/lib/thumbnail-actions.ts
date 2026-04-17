'use server';

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import type { VideoEmbed } from '@/types/post';
import { requireAuth } from '@/lib/auth-guards';

/**
 * Download a GIF, extract its first frame as JPEG, upload to Supabase,
 * and return the public thumbnail URL.
 */
export async function generateGifThumbnail(gifUrl: string): Promise<string | null> {
    await requireAuth();
    try {
        // Download the GIF
        const response = await fetch(gifUrl);
        if (!response.ok) {
            console.error(`Failed to download GIF: ${response.status} ${gifUrl}`);
            return null;
        }

        const gifBuffer = Buffer.from(await response.arrayBuffer());

        // Extract first frame and convert to JPEG
        const jpegBuffer = await sharp(gifBuffer, { pages: 1 })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Upload to Supabase
        const supabase = createAdminClient();
        const filename = `thumbnails/gif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(filename, jpegBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000', // 1 year — thumbnails don't change
                upsert: false,
            });

        if (uploadError) {
            console.error('Thumbnail upload error:', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filename);
        return publicUrl;
    } catch (err) {
        console.error('GIF thumbnail generation failed:', err);
        return null;
    }
}

/**
 * Fetch a video thumbnail (YouTube/Vimeo/Loom), upload to Supabase,
 * and return the public thumbnail URL.
 */
export async function fetchVideoThumbnail(embed: VideoEmbed): Promise<string | null> {
    await requireAuth();
    try {
        let thumbnailSourceUrl: string | null = null;

        switch (embed.service) {
            case 'youtube':
                thumbnailSourceUrl = `https://img.youtube.com/vi/${embed.id}/hqdefault.jpg`;
                break;
            case 'vimeo':
                try {
                    const oembedRes = await fetch(
                        `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.url)}`
                    );
                    if (oembedRes.ok) {
                        const data = await oembedRes.json();
                        thumbnailSourceUrl = data.thumbnail_url || null;
                    }
                } catch {
                    console.error('Vimeo oEmbed fetch failed');
                }
                break;
            case 'loom':
                try {
                    const loomRes = await fetch(
                        `https://www.loom.com/v1/oembed?url=${encodeURIComponent(embed.url)}`
                    );
                    if (loomRes.ok) {
                        const data = await loomRes.json();
                        thumbnailSourceUrl = data.thumbnail_url || null;
                    }
                } catch {
                    console.error('Loom oEmbed fetch failed');
                }
                break;
        }

        if (!thumbnailSourceUrl) return null;

        // Download the thumbnail image
        const response = await fetch(thumbnailSourceUrl);
        if (!response.ok) return null;

        const imageBuffer = Buffer.from(await response.arrayBuffer());

        // Optimize as JPEG
        const jpegBuffer = await sharp(imageBuffer)
            .jpeg({ quality: 85 })
            .toBuffer();

        // Upload to Supabase
        const supabase = createAdminClient();
        const filename = `thumbnails/video-${embed.service}-${embed.id}-${Date.now()}.jpg`;

        const { error: uploadError } = await supabase.storage
            .from('post-media')
            .upload(filename, jpegBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000',
                upsert: false,
            });

        if (uploadError) {
            console.error('Video thumbnail upload error:', uploadError);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filename);
        return publicUrl;
    } catch (err) {
        console.error('Video thumbnail fetch failed:', err);
        return null;
    }
}

/**
 * Process all GIFs in a post and generate thumbnails.
 * Returns an array of thumbnail URLs parallel to the input GIF URLs.
 */
export async function generateAllGifThumbnails(gifUrls: string[]): Promise<string[]> {
    await requireAuth();
    if (!gifUrls.length) return [];

    const results = await Promise.allSettled(
        gifUrls.map((url) => generateGifThumbnail(url))
    );

    return results.map((result, i) => {
        if (result.status === 'fulfilled' && result.value) {
            return result.value;
        }
        // Fallback: use the original GIF URL (will still load as GIF but at least won't break)
        console.warn(`Thumbnail generation failed for GIF ${i}, using fallback`);
        return gifUrls[i];
    });
}

/**
 * Process all video embeds and fetch/store thumbnails.
 * Returns enriched embeds with thumbnailUrl populated.
 */
export async function enrichEmbedsWithThumbnails(embeds: VideoEmbed[]): Promise<VideoEmbed[]> {
    await requireAuth();
    if (!embeds.length) return [];

    const results = await Promise.allSettled(
        embeds.map(async (embed) => {
            const thumbnailUrl = await fetchVideoThumbnail(embed);
            return { ...embed, thumbnailUrl: thumbnailUrl || undefined };
        })
    );

    return results.map((result, i) => {
        if (result.status === 'fulfilled') {
            return result.value;
        }
        return embeds[i];
    });
}
