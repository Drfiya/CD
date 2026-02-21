import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    const result = await pool.query(
        `UPDATE "CommunitySettings" SET "communityLogo" = $1 WHERE id = 'singleton' RETURNING *`,
        ['/community-logo.png']
    );
    console.log('Updated:', JSON.stringify(result.rows[0], null, 2));
}

main()
    .then(() => pool.end())
    .catch(console.error);
