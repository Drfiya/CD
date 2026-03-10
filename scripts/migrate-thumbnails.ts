/**
 * Migration script: Generate thumbnails for all existing posts with GIFs or video embeds.
 *
 * Usage: npx tsx scripts/migrate-thumbnails.ts
 *
 * This script:
 * 1. Finds all posts with non-empty `gifs` or `embeds`
 * 2. For each GIF: downloads → extracts first frame with sharp → uploads JPEG to Supabase
 * 3. For each video embed: fetches thumbnail → uploads to Supabase
 * 4. Updates post records with new `gifThumbnails` and enriched `embeds`
 */

import 'dotenv/config';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL not set');

const isLocalhost = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');
const pool = new pg.Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

interface VideoEmbed {
    service: string;
    id: string;
    url: string;
    thumbnailUrl?: string;
}

async function generateGifThumbnail(gifUrl: string): Promise<string | null> {
    try {
        const response = await fetch(gifUrl);
        if (!response.ok) return null;

        const gifBuffer = Buffer.from(await response.arrayBuffer());
        const jpegBuffer = await sharp(gifBuffer, { pages: 1 })
            .jpeg({ quality: 80 })
            .toBuffer();

        const supabase = createAdminClient();
        const filename = `thumbnails/gif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

        const { error } = await supabase.storage
            .from('post-media')
            .upload(filename, jpegBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000',
                upsert: false,
            });

        if (error) {
            console.error('  Upload error:', error.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filename);
        return publicUrl;
    } catch (err) {
        console.error('  GIF thumbnail error:', err);
        return null;
    }
}

async function fetchVideoThumbnail(embed: VideoEmbed): Promise<string | null> {
    try {
        let thumbnailSourceUrl: string | null = null;

        switch (embed.service) {
            case 'youtube':
                thumbnailSourceUrl = `https://img.youtube.com/vi/${embed.id}/hqdefault.jpg`;
                break;
            case 'vimeo':
                try {
                    const res = await fetch(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(embed.url)}`);
                    if (res.ok) {
                        const data = await res.json();
                        thumbnailSourceUrl = data.thumbnail_url || null;
                    }
                } catch { /* ignore */ }
                break;
            case 'loom':
                try {
                    const res = await fetch(`https://www.loom.com/v1/oembed?url=${encodeURIComponent(embed.url)}`);
                    if (res.ok) {
                        const data = await res.json();
                        thumbnailSourceUrl = data.thumbnail_url || null;
                    }
                } catch { /* ignore */ }
                break;
        }

        if (!thumbnailSourceUrl) return null;

        const response = await fetch(thumbnailSourceUrl);
        if (!response.ok) return null;

        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 85 }).toBuffer();

        const supabase = createAdminClient();
        const filename = `thumbnails/video-${embed.service}-${embed.id}-${Date.now()}.jpg`;

        const { error } = await supabase.storage
            .from('post-media')
            .upload(filename, jpegBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '31536000',
                upsert: false,
            });

        if (error) {
            console.error('  Video thumb upload error:', error.message);
            return null;
        }

        const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(filename);
        return publicUrl;
    } catch (err) {
        console.error('  Video thumbnail error:', err);
        return null;
    }
}

async function main() {
    console.log('🔍 Finding posts with GIFs or video embeds...\n');

    const posts = await db.post.findMany({
        select: { id: true, gifs: true, embeds: true, gifThumbnails: true },
    });

    const postsWithMedia = posts.filter((p) => {
        const gifs = (p.gifs as unknown as string[]) || [];
        const embeds = (p.embeds as unknown as VideoEmbed[]) || [];
        return gifs.length > 0 || embeds.length > 0;
    });

    console.log(`Found ${postsWithMedia.length} posts with media to process.\n`);

    let processed = 0;
    let gifCount = 0;
    let videoCount = 0;

    for (const post of postsWithMedia) {
        const gifs = (post.gifs as unknown as string[]) || [];
        const embeds = (post.embeds as unknown as VideoEmbed[]) || [];
        const existingThumbnails = (post.gifThumbnails as unknown as string[]) || [];

        console.log(`📝 Post ${post.id}: ${gifs.length} GIFs, ${embeds.length} video embeds`);

        // Process GIFs
        const gifThumbnails: string[] = [];
        for (let i = 0; i < gifs.length; i++) {
            // Skip if thumbnail already exists
            if (existingThumbnails[i] && existingThumbnails[i] !== gifs[i]) {
                console.log(`  ✅ GIF ${i + 1}: thumbnail already exists`);
                gifThumbnails.push(existingThumbnails[i]);
                continue;
            }

            console.log(`  🖼️  GIF ${i + 1}: generating thumbnail...`);
            const thumbnail = await generateGifThumbnail(gifs[i]);
            if (thumbnail) {
                gifThumbnails.push(thumbnail);
                gifCount++;
                console.log(`  ✅ GIF ${i + 1}: thumbnail generated`);
            } else {
                gifThumbnails.push(gifs[i]); // fallback to original
                console.log(`  ⚠️  GIF ${i + 1}: failed, using original`);
            }
        }

        // Process video embeds
        const enrichedEmbeds: VideoEmbed[] = [];
        for (let i = 0; i < embeds.length; i++) {
            const embed = embeds[i];

            // Skip if thumbnail already exists
            if (embed.thumbnailUrl) {
                console.log(`  ✅ Video ${i + 1} (${embed.service}): thumbnail already exists`);
                enrichedEmbeds.push(embed);
                continue;
            }

            console.log(`  🎬 Video ${i + 1} (${embed.service}): fetching thumbnail...`);
            const thumbnailUrl = await fetchVideoThumbnail(embed);
            enrichedEmbeds.push({ ...embed, thumbnailUrl: thumbnailUrl || undefined });

            if (thumbnailUrl) {
                videoCount++;
                console.log(`  ✅ Video ${i + 1}: thumbnail saved`);
            } else {
                console.log(`  ⚠️  Video ${i + 1}: failed to get thumbnail`);
            }
        }

        // Update post
        await db.post.update({
            where: { id: post.id },
            data: {
                gifThumbnails: gifThumbnails,
                embeds: enrichedEmbeds as unknown as any,
            },
        });

        processed++;
        console.log(`  ✅ Post updated\n`);
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   Posts processed: ${processed}`);
    console.log(`   GIF thumbnails generated: ${gifCount}`);
    console.log(`   Video thumbnails fetched: ${videoCount}`);

    await db.$disconnect();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
