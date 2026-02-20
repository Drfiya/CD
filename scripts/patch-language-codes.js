/**
 * One-time script to re-detect and fix languageCode for existing posts
 * that may have been misdetected (e.g. stored as 'en' when actually French).
 *
 * Usage: node scripts/patch-language-codes.js
 *
 * Requires: DEEPL_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN
 * in the project .env file.
 */

const fs = require('fs');
const path = require('path');

// Load .env from project root
const env = {};
const envPath = path.resolve(__dirname, '../.env');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+?)=(.*)/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
});

const DEEPL_API_KEY = env.DEEPL_API_KEY;
const DEEPL_API_URL = env.DEEPL_API_URL || 'https://api-free.deepl.com';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;

if (!DEEPL_API_KEY) {
    console.error('❌ DEEPL_API_KEY is not set in .env');
    process.exit(1);
}

/**
 * Detect language of text via DeepL API
 */
async function detectLanguage(text) {
    const response = await fetch(`${DEEPL_API_URL}/v2/translate`, {
        method: 'POST',
        headers: {
            'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: [text.slice(0, 200)],
            target_lang: 'EN-US',
        }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.translations?.[0]?.detected_source_language) {
        return data.translations[0].detected_source_language
            .split('-')[0]
            .toLowerCase();
    }
    return null;
}

async function main() {
    // Get service_role key via Supabase Management API
    const keysRes = await fetch(
        `https://api.supabase.com/v1/projects/rgltabjdjrbmbjrjoqga/api-keys`,
        { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } }
    );
    const keys = await keysRes.json();
    const srKey = keys.find(k => k.name === 'service_role');

    if (!srKey) {
        console.error('❌ Could not fetch service_role key');
        process.exit(1);
    }

    const { createClient } = require(path.resolve(__dirname, '../node_modules/@supabase/supabase-js'));
    const supabase = createClient(SUPABASE_URL, srKey.api_key);

    // Fetch all posts
    const { data: posts, error } = await supabase
        .from('Post')
        .select('id, title, plainText, languageCode')
        .order('createdAt', { ascending: false });

    if (error) {
        console.error('❌ Failed to fetch posts:', error.message);
        process.exit(1);
    }

    console.log(`Found ${posts.length} posts. Checking language codes...\n`);

    let updated = 0;
    for (const post of posts) {
        const text = post.plainText || post.title || '';
        if (!text.trim()) continue;

        const detected = await detectLanguage(text);
        if (!detected) {
            console.log(`  ⚠️  [${post.id}] Could not detect language, skipping`);
            continue;
        }

        const stored = post.languageCode || 'en';
        if (detected !== stored) {
            console.log(
                `  🔧 [${post.id}] "${text.slice(0, 40)}..." ` +
                `stored=${stored} → detected=${detected}`
            );

            const { error: updateError } = await supabase
                .from('Post')
                .update({ languageCode: detected })
                .eq('id', post.id);

            if (updateError) {
                console.error(`     ❌ Update failed: ${updateError.message}`);
            } else {
                updated++;
            }
        } else {
            console.log(
                `  ✅ [${post.id}] "${text.slice(0, 40)}..." lang=${stored} (correct)`
            );
        }
    }

    console.log(`\n✅ Done. Updated ${updated} of ${posts.length} posts.`);
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
