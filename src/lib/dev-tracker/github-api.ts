/**
 * Server-side GitHub REST API service for fetching repo data from Drfiya/CD.
 * Uses GITHUB_PAT env var — no client-side token storage.
 */

const BASE_URL = 'https://api.github.com/repos/Drfiya/CD';

function getToken(): string {
    const token = process.env.GITHUB_PAT;
    if (!token) throw new Error('GITHUB_PAT environment variable is not set');
    return token;
}

function headers(): Record<string, string> {
    return {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${getToken()}`,
    };
}

// --- Types ---

export interface GitHubBranch {
    name: string;
    commit: { sha: string; url: string };
    protected: boolean;
}

export interface GitHubCommit {
    sha: string;
    commit: {
        author: { name: string; date: string };
        committer: { name: string; date: string };
        message: string;
    };
    author?: { login: string } | null;
    committer?: { login: string } | null;
}

export interface GitHubPullRequest {
    number: number;
    title: string;
    state: string; // 'open' | 'closed'
    merged_at: string | null;
    created_at: string;
    updated_at: string;
    head: { ref: string; sha: string };
    base: { ref: string };
    user?: { login: string } | null;
}

export interface SyncResult {
    branches: GitHubBranch[];
    commitsByBranch: Record<string, GitHubCommit[]>;
    pullRequests: GitHubPullRequest[];
}

// --- Fetching helpers ---

async function apiFetch<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: headers(),
        next: { revalidate: 0 }, // Always fresh in Next.js
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message || `GitHub API error: ${res.status}`);
    }
    return res.json() as Promise<T>;
}

/**
 * Parse GitHub's Link header to extract the "next" page URL.
 */
function getNextPageUrl(response: Response): string | null {
    const link = response.headers.get('Link');
    if (!link) return null;
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    return match ? match[1] : null;
}

/**
 * Fetch all pages of a paginated GitHub endpoint.
 */
async function apiFetchAllPages<T>(endpoint: string): Promise<T[]> {
    let url: string | null = `${BASE_URL}${endpoint}`;
    let allResults: T[] = [];

    while (url) {
        const res = await fetch(url, { headers: headers(), next: { revalidate: 0 } });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error((body as { message?: string }).message || `GitHub API error: ${res.status}`);
        }
        const data = (await res.json()) as T[];
        allResults = allResults.concat(data);
        url = getNextPageUrl(res);
    }

    return allResults;
}

// --- Public API ---

export async function fetchBranches(): Promise<GitHubBranch[]> {
    return apiFetchAllPages<GitHubBranch>('/branches?per_page=100');
}

export async function fetchCommitsForBranch(branch: string): Promise<GitHubCommit[]> {
    return apiFetchAllPages<GitHubCommit>(
        `/commits?sha=${encodeURIComponent(branch)}&per_page=100`
    );
}

export async function fetchPRCommits(prNumber: number): Promise<GitHubCommit[]> {
    return apiFetchAllPages<GitHubCommit>(`/pulls/${prNumber}/commits?per_page=100`);
}

export async function fetchPullRequests(): Promise<GitHubPullRequest[]> {
    return apiFetchAllPages<GitHubPullRequest>('/pulls?state=all&per_page=100');
}

/**
 * Full sync: fetch branches, commits per branch, and PRs in parallel.
 * Also fetches commits for merged/closed PRs whose branches no longer exist.
 */
export async function fullSync(): Promise<SyncResult> {
    const [branches, pullRequests] = await Promise.all([
        fetchBranches(),
        fetchPullRequests(),
    ]);

    const branchNames = new Set(branches.map((b) => b.name));
    const commitsByBranch: Record<string, GitHubCommit[]> = {};

    // Fetch commits for each existing branch (batched, 10 concurrent)
    const batchSize = 10;
    for (let i = 0; i < branches.length; i += batchSize) {
        const batch = branches.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map((b) => fetchCommitsForBranch(b.name).catch(() => []))
        );
        batch.forEach((b, idx) => {
            commitsByBranch[b.name] = results[idx];
        });
    }

    // Fetch commits for merged/closed PRs with deleted branches
    const deletedBranchPRs = pullRequests.filter(
        (pr) =>
            pr.head?.ref &&
            !branchNames.has(pr.head.ref) &&
            (pr.merged_at || pr.state === 'closed')
    );

    // Deduplicate by branch name
    const seenBranches = new Set<string>();
    const uniqueDeletedPRs = deletedBranchPRs.filter((pr) => {
        if (seenBranches.has(pr.head.ref)) return false;
        seenBranches.add(pr.head.ref);
        return true;
    });

    for (let i = 0; i < uniqueDeletedPRs.length; i += batchSize) {
        const batch = uniqueDeletedPRs.slice(i, i + batchSize);
        const results = await Promise.all(
            batch.map((pr) => fetchPRCommits(pr.number).catch(() => []))
        );
        batch.forEach((pr, idx) => {
            commitsByBranch[pr.head.ref] = results[idx];
        });
    }

    return { branches, commitsByBranch, pullRequests };
}
