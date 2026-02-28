import db from '../src/lib/db.js';

async function createAiToolTable() {
    await db.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AiTool" (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name VARCHAR(200) NOT NULL,
            url VARCHAR(500) NOT NULL,
            description TEXT,
            active BOOLEAN NOT NULL DEFAULT true,
            "openInNewTab" BOOLEAN NOT NULL DEFAULT true,
            position INTEGER NOT NULL DEFAULT 0,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);
    await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "AiTool_active_position_idx" ON "AiTool" (active, position);
    `);

    // Seed with existing tools
    const tools = [
        { name: 'GLP Study Protocol Generator', url: 'https://glp-generator.scienceexperts.ai' },
        { name: 'Regulatory Submission Cross-Reference Auditor', url: 'https://regulatory-auditor.scienceexperts.ai' },
        { name: 'Adverse Event Signal Detection Dashboard', url: 'https://adverse-event.scienceexperts.ai' },
        { name: 'Dose Selection Justification Generator', url: 'https://dose-justification.scienceexperts.ai' },
        { name: 'Historical Control Database', url: 'https://historical-control.scienceexperts.ai' },
    ];

    for (let i = 0; i < tools.length; i++) {
        const tool = tools[i];
        await db.aiTool.upsert({
            where: { id: `seed-tool-${i}` },
            update: {},
            create: {
                id: `seed-tool-${i}`,
                name: tool.name,
                url: tool.url,
                active: true,
                openInNewTab: true,
                position: i,
            },
        });
    }

    console.log('✅ AiTool table created and seeded with 5 tools!');
    await db.$disconnect();
}

createAiToolTable().catch(e => { console.error(e); process.exit(1); });
