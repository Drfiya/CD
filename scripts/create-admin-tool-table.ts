import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "AdminTool" (
                "id" TEXT NOT NULL,
                "name" VARCHAR(200) NOT NULL,
                "url" VARCHAR(500) NOT NULL,
                "description" TEXT,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "AdminTool_pkey" PRIMARY KEY ("id")
            );
        `);
        console.log('✅ AdminTool table created successfully!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

main();
