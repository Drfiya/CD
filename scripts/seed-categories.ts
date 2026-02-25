import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const isLocalhost = connectionString.includes('127.0.0.1') || connectionString.includes('localhost');

const pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
});

async function seedCategories() {
    const categories = [
        { name: 'General', color: '#6b7280' },
        { name: 'Announcements', color: '#ef4444' },
        { name: 'Introductions', color: '#22c55e' },
        { name: 'Questions', color: '#3b82f6' },
    ];

    for (const cat of categories) {
        await pool.query(
            `INSERT INTO "Category" (id, name, color, "createdAt", "updatedAt")
       VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW())
       ON CONFLICT (name) DO NOTHING`,
            [cat.name, cat.color]
        );
        console.log('Upserted:', cat.name);
    }

    const { rows } = await pool.query('SELECT * FROM "Category" ORDER BY name');
    console.log('Total categories:', rows.length);
    console.log(JSON.stringify(rows, null, 2));

    await pool.end();
}

seedCategories()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
