/**
 * One-time migration script: Create the community-assets bucket in Supabase Storage
 * and upload the existing local logo file.
 * 
 * Usage: npx tsx scripts/migrate-logo-to-supabase.ts
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Try to create the community-assets bucket (public)
    console.log('1. Creating community-assets bucket...');
    const { error: bucketError } = await supabase.storage.createBucket('community-assets', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
    });

    if (bucketError) {
        if (bucketError.message?.includes('already exists')) {
            console.log('   ✓ Bucket already exists');
        } else {
            console.error('   ✗ Failed to create bucket:', bucketError.message);
            console.log('   → You may need to create it manually in Supabase Dashboard > Storage');
            console.log('   → Bucket name: community-assets, Public: Yes');
        }
    } else {
        console.log('   ✓ Bucket created successfully');
    }

    // 2. Find and upload the existing logo file
    const publicDir = join(process.cwd(), 'public');
    const candidates = ['community-logo.jpeg', 'community-logo.png', 'community-logo.jpg', 'community-logo.webp'];
    let logoFile: string | null = null;

    for (const name of candidates) {
        const path = join(publicDir, name);
        if (existsSync(path)) {
            logoFile = path;
            break;
        }
    }

    if (!logoFile) {
        console.log('2. No local logo file found in public/, skipping upload.');
        console.log('   You can upload a logo through the admin settings UI.');
        return;
    }

    const ext = logoFile.split('.').pop() || 'png';
    const mimeType = ext === 'jpeg' || ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const filename = `community-logo-${Date.now()}.${ext}`;

    console.log(`2. Uploading ${logoFile} to Supabase Storage...`);
    const fileBuffer = readFileSync(logoFile);

    const { error: uploadError } = await supabase.storage
        .from('community-assets')
        .upload(filename, fileBuffer, {
            upsert: true,
            contentType: mimeType,
        });

    if (uploadError) {
        console.error('   ✗ Upload failed:', uploadError.message);
        return;
    }

    const { data: urlData } = supabase.storage
        .from('community-assets')
        .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;
    console.log(`   ✓ Uploaded: ${publicUrl}`);

    // 3. Update database
    console.log('3. Updating database with new logo URL...');
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.log('   ✗ DATABASE_URL not set, please update communityLogo manually.');
        console.log(`   → Set communityLogo to: ${publicUrl}`);
        return;
    }

    const pool = new Pool({ connectionString });
    try {
        await pool.query(
            `UPDATE "CommunitySettings" SET "communityLogo" = $1 WHERE id = 'singleton'`,
            [publicUrl]
        );
        console.log('   ✓ Database updated');
    } catch (err) {
        console.error('   ✗ DB update failed:', err);
        console.log(`   → Manually set communityLogo to: ${publicUrl}`);
    } finally {
        await pool.end();
    }

    console.log('\n✅ Migration complete! The logo now loads from Supabase Storage.');
}

main().catch(console.error);
