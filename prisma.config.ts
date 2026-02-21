import { defineConfig, env } from 'prisma/config';
import { config } from 'dotenv';

// Load .env for local development
config({ path: '.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'), // Use direct connection for CLI (migrations)
  },
});
