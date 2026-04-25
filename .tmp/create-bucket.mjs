import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('Existing buckets:', buckets?.map(b => b.id));

  const exists = buckets?.some(b => b.id === 'bug-screenshots');
  if (exists) {
    console.log('Bucket "bug-screenshots" already exists.');
    return;
  }

  const { data, error } = await supabase.storage.createBucket('bug-screenshots', {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  });

  if (error) {
    console.error('Failed to create bucket:', error);
  } else {
    console.log('Created bucket:', data);
  }
}

main();
