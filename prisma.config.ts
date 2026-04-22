import { defineConfig, env } from '@prisma/config';
import { config } from 'dotenv';

// Load .env.local first (dev overrides), then .env as fallback
// .env.local points to the dev database; .env points to production
config({ path: '.env.local', override: true });
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL, // Use whatever is available
  },
});
