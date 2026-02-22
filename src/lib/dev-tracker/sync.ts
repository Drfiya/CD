/**
 * Sync engine: merges GitHub data with database card metadata.
 * Produces enriched card objects with auto-assigned columns.
 *
 * Ported from the standalone build tracker's sync.js — now uses
 * database-backed metadata instead of localStorage.
 */

import type { GitHubCommit, GitHubPullRequest } from './github-api';

// --- Types ---

export interface TrackerCard {
    branchName: string;
    title: string;
    column: string;
    commits: GitHubCommit[];
    commitCount: number;
    lastCommitDate: string | null;
    freshness: 'green' | 'yellow' | 'gray';
    authors: string[];
    platformTag: string | null;
    platformTagLabel: string | null;
    priority: string | null;
    assignee: string | null;
    flagged: boolean;
    notes: string | null;
    prNumber: number | null;
    prState: string | null;
    isMainGrouped: boolean; // true = clustered from main-branch commits
}

export interface CardMetadata {
    column?: string;
    priority?: string | null;
    assignee?: string | null;
    platformTag?: string | null;
    flagged?: boolean;
    notes?: string | null;
}

// --- Constants ---

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// --- Identity normalization ---

const IDENTITY_MAP: Record<string, string> = {
    drfiya: 'Lutfiya',
    lutfiya: 'Lutfiya',
    'lutfiya miller': 'Lutfiya',
    'chris müller': 'Chris',
    'chris muller': 'Chris',
    chris: 'Chris',
    chriss54: 'Chris',
};

function normalizeAuthor(raw: string): string {
    const lower = raw.toLowerCase().trim();
    return IDENTITY_MAP[lower] || raw;
}

/** Extract unique authors from commits, normalizing known identities. */
export function extractAuthors(commits: GitHubCommit[]): string[] {
    const seen = new Set<string>();
    const authors: string[] = [];

    for (const c of commits) {
        const raw = c.author?.login || c.commit.author.name;
        const name = normalizeAuthor(raw);
        if (!seen.has(name)) {
            seen.add(name);
            authors.push(name);
        }
    }

    return authors;
}

// --- Topic detection ---

const TOPIC_PATTERNS: { pattern: RegExp; topic: string }[] = [
    { pattern: /translat|i18n|language|locale/i, topic: 'translation' },
    { pattern: /landing|hero|homepage/i, topic: 'landing-page' },
    { pattern: /upload|media|image|attach|supabase.*storage/i, topic: 'media-upload' },
    { pattern: /kanban|board|drag/i, topic: 'kanban' },
    { pattern: /auth|login|register|password|session/i, topic: 'auth' },
    { pattern: /post|comment|feed|community|like|react/i, topic: 'community' },
    { pattern: /stripe|payment|billing|subscription|membership/i, topic: 'payments' },
    { pattern: /giphy|gif|sticker/i, topic: 'giphy' },
    { pattern: /admin|moderate|settings|role|ban/i, topic: 'admin' },
    { pattern: /prisma|database|migration|schema/i, topic: 'database' },
    { pattern: /deploy|vercel|build|ci/i, topic: 'deployment' },
    { pattern: /style|css|theme|dark\s*mode|ui/i, topic: 'styling' },
];

const TOPIC_LABELS: Record<string, string> = {
    translation: 'Translation & i18n',
    'landing-page': 'Landing Page',
    'media-upload': 'Media & Uploads',
    kanban: 'Kanban Board',
    auth: 'Authentication',
    community: 'Community & Posts',
    payments: 'Payments & Billing',
    giphy: 'GIPHY Integration',
    admin: 'Admin & Settings',
    database: 'Database & Migrations',
    deployment: 'Deployment & CI',
    styling: 'Styling & UI',
};

export function detectTopic(message: string): string | null {
    for (const { pattern, topic } of TOPIC_PATTERNS) {
        if (pattern.test(message)) return topic;
    }
    return null;
}

export function getTopicLabel(topic: string): string {
    return TOPIC_LABELS[topic] || topic;
}

// --- Column auto-assignment ---

function autoAssignColumn(branchName: string, pullRequests: GitHubPullRequest[]): string {
    const prs = pullRequests.filter((pr) => pr.head?.ref === branchName);
    const openPR = prs.find((pr) => pr.state === 'open' && !pr.merged_at);
    const mergedPR = prs.find((pr) => pr.merged_at);

    if (mergedPR) return 'merged';
    if (openPR) return 'pr_open';
    return 'active';
}

// --- Freshness ---

function getFreshness(commits: GitHubCommit[]): 'green' | 'yellow' | 'gray' {
    if (commits.length === 0) return 'gray';

    const latest = new Date(commits[0].commit.author.date).getTime();
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (latest >= today.getTime()) return 'green';
    if (now - latest < SEVEN_DAYS) return 'yellow';
    return 'gray';
}

// --- Card builder ---

function buildCard(
    name: string,
    commits: GitHubCommit[],
    pullRequests: GitHubPullRequest[],
    dbMeta: CardMetadata | null,
    opts: { isMainGrouped?: boolean } = {}
): TrackerCard {
    const branchPRs = pullRequests.filter((pr) => pr.head?.ref === name);
    const openPR = branchPRs.find((pr) => pr.state === 'open');
    const mergedPR = branchPRs.find((pr) => pr.merged_at);
    const relevantPR = openPR || mergedPR;

    // Column priority: database override > auto-assignment
    const autoCol = autoAssignColumn(name, pullRequests);
    const column = dbMeta?.column || autoCol;

    // Detect topic from branch name first, then from commit messages
    let topic = detectTopic(name);
    if (!topic && commits.length > 0) {
        for (const c of commits.slice(0, 10)) {
            topic = detectTopic(c.commit.message);
            if (topic) break;
        }
    }

    const platformTag = dbMeta?.platformTag || topic;

    return {
        branchName: name,
        title: name.replace(/^(feat|fix|feature|hotfix|chore|refactor)\//i, ''),
        column,
        commits,
        commitCount: commits.length,
        lastCommitDate: commits[0]?.commit.author.date || null,
        freshness: getFreshness(commits),
        authors: extractAuthors(commits),
        platformTag,
        platformTagLabel: platformTag ? getTopicLabel(platformTag) : null,
        priority: dbMeta?.priority || null,
        assignee: dbMeta?.assignee || null,
        flagged: dbMeta?.flagged || false,
        notes: dbMeta?.notes || null,
        prNumber: relevantPR?.number || null,
        prState: relevantPR ? (relevantPR.merged_at ? 'merged' : relevantPR.state) : null,
        isMainGrouped: opts.isMainGrouped || false,
    };
}

// --- Main-branch commit grouping ---

/**
 * Groups main-branch commits into feature clusters by topic keyword.
 * Uses conventional commits (feat:, fix:) as group boundaries, then
 * merges groups with the same detected topic.
 */
function groupCommitsIntoFeatures(
    commits: GitHubCommit[]
): Map<string, GitHubCommit[]> {
    if (commits.length === 0) return new Map();

    // Phase 1: group by conventional commit boundaries
    const rawGroups: { topic: string | null; commits: GitHubCommit[] }[] = [];
    let currentGroup: GitHubCommit[] = [];
    let currentTopic: string | null = null;

    for (const c of commits) {
        const msg = c.commit.message;
        const isNewFeature = /^(feat|feature)(\(.+\))?:/i.test(msg);
        const topic = detectTopic(msg);

        if (isNewFeature && currentGroup.length > 0) {
            rawGroups.push({ topic: currentTopic, commits: [...currentGroup] });
            currentGroup = [];
            currentTopic = null;
        }

        currentGroup.push(c);
        if (topic && !currentTopic) currentTopic = topic;
    }

    if (currentGroup.length > 0) {
        rawGroups.push({ topic: currentTopic, commits: currentGroup });
    }

    // Phase 2: merge groups with the same topic
    const mergedByTopic = new Map<string, GitHubCommit[]>();
    let miscCounter = 0;

    for (const group of rawGroups) {
        const key = group.topic || `misc-${miscCounter++}`;
        const existing = mergedByTopic.get(key) || [];
        mergedByTopic.set(key, [...existing, ...group.commits]);
    }

    return mergedByTopic;
}

// --- Public: build all cards ---

export function buildCards(
    branches: { name: string }[],
    commitsByBranch: Record<string, GitHubCommit[]>,
    pullRequests: GitHubPullRequest[],
    dbMetaByBranch: Record<string, CardMetadata>
): TrackerCard[] {
    const cards: TrackerCard[] = [];

    for (const branch of branches) {
        if (branch.name === 'main' || branch.name === 'master') continue;

        const commits = commitsByBranch[branch.name] || [];
        const meta = dbMetaByBranch[branch.name] || null;
        cards.push(buildCard(branch.name, commits, pullRequests, meta));
    }

    // Add cards for deleted branches that had PRs
    const activeBranchNames = new Set(branches.map((b) => b.name));
    const deletedBranchNames = Object.keys(commitsByBranch).filter(
        (name) => !activeBranchNames.has(name) && name !== 'main' && name !== 'master'
    );

    for (const name of deletedBranchNames) {
        const commits = commitsByBranch[name] || [];
        const meta = dbMetaByBranch[name] || null;
        cards.push(buildCard(name, commits, pullRequests, meta));
    }

    // Group main-branch commits into feature clusters
    const mainCommits = commitsByBranch['main'] || commitsByBranch['master'] || [];
    const featureGroups = groupCommitsIntoFeatures(mainCommits);

    for (const [topic, commits] of featureGroups) {
        const syntheticName = `main/${topic}`;
        // Only add grouped cards that aren't already covered by a real branch
        if (!activeBranchNames.has(syntheticName)) {
            const meta = dbMetaByBranch[syntheticName] || null;
            const card = buildCard(syntheticName, commits, pullRequests, meta, {
                isMainGrouped: true,
            });
            // Force grouped main commits to 'merged' column
            card.column = 'merged';
            cards.push(card);
        }
    }

    return cards;
}

// --- Stats helpers ---

export interface TrackerStats {
    totalFeatures: number;
    activeFeatures: number;
    shippedFeatures: number;
    commitsThisWeek: number;
    topTopics: { topic: string; label: string; count: number }[];
}

export function computeStats(cards: TrackerCard[]): TrackerStats {
    const now = Date.now();
    let commitsThisWeek = 0;
    const topicCounts = new Map<string, number>();

    for (const card of cards) {
        // Count this-week commits
        for (const c of card.commits) {
            if (now - new Date(c.commit.author.date).getTime() < SEVEN_DAYS) {
                commitsThisWeek++;
            }
        }

        // Count topics
        if (card.platformTag) {
            topicCounts.set(card.platformTag, (topicCounts.get(card.platformTag) || 0) + 1);
        }
    }

    const topTopics = [...topicCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([topic, count]) => ({ topic, label: getTopicLabel(topic), count }));

    return {
        totalFeatures: cards.length,
        activeFeatures: cards.filter((c) => c.column === 'active').length,
        shippedFeatures: cards.filter((c) => c.column === 'merged').length,
        commitsThisWeek,
        topTopics,
    };
}
