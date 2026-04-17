'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth-guards';
import db from '@/lib/db';
import type { FeatureIdeaStatus } from '@/generated/prisma/client';

function revalidateIdeas() {
    revalidatePath('/admin/feature-ideas');
}

/**
 * Get all feature ideas with upvote/comment counts
 */
export async function getFeatureIdeas(options?: {
    status?: FeatureIdeaStatus;
    sort?: 'upvotes' | 'newest' | 'oldest';
}) {
    const session = await requireAdmin();
    const where = options?.status ? { status: options.status } : {};

    const ideas = await db.featureIdea.findMany({
        where,
        include: {
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { upvotes: true, comments: true } },
            upvotes: {
                where: { userId: session.user.id },
                select: { id: true },
            },
        },
        orderBy: options?.sort === 'oldest'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' },
    });

    // Map to add hasUpvoted flag
    const mapped = ideas.map((idea) => ({
        ...idea,
        upvoteCount: idea._count.upvotes,
        commentCount: idea._count.comments,
        hasUpvoted: idea.upvotes.length > 0,
        upvotes: undefined,
        _count: undefined,
    }));

    // Sort by upvotes if requested (default)
    if (!options?.sort || options.sort === 'upvotes') {
        mapped.sort((a, b) => b.upvoteCount - a.upvoteCount);
    }

    return mapped;
}

/**
 * Get a single feature idea with all comments
 */
export async function getFeatureIdea(id: string) {
    const session = await requireAdmin();

    const idea = await db.featureIdea.findUnique({
        where: { id },
        include: {
            author: { select: { id: true, name: true, image: true, role: true } },
            comments: {
                include: {
                    author: { select: { id: true, name: true, image: true } },
                },
                orderBy: { createdAt: 'asc' },
            },
            _count: { select: { upvotes: true } },
            upvotes: {
                where: { userId: session.user.id },
                select: { id: true },
            },
        },
    });

    if (!idea) return null;

    return {
        ...idea,
        upvoteCount: idea._count.upvotes,
        hasUpvoted: idea.upvotes.length > 0,
        currentUserId: session.user.id,
        currentUserRole: session.user.role,
        upvotes: undefined,
        _count: undefined,
    };
}

/**
 * Create a new feature idea
 */
export async function createFeatureIdea(data: {
    title: string;
    description: string;
    priority?: string;
    tags?: string[];
}) {
    const session = await requireAdmin();

    await db.featureIdea.create({
        data: {
            title: data.title,
            description: data.description,
            priority: data.priority || null,
            tags: data.tags || [],
            authorId: session.user.id,
        },
    });

    revalidateIdeas();
}

/**
 * Update a feature idea (author or owner only)
 */
export async function updateFeatureIdea(
    id: string,
    data: {
        title?: string;
        description?: string;
        priority?: string | null;
        tags?: string[];
    }
) {
    const session = await requireAdmin();
    const idea = await db.featureIdea.findUnique({ where: { id } });
    if (!idea) throw new Error('Not found');

    // Only author or owner can edit
    if (idea.authorId !== session.user.id && session.user.role !== 'owner') {
        throw new Error('Only the author or owner can edit this idea');
    }

    await db.featureIdea.update({ where: { id }, data });
    revalidateIdeas();
    revalidatePath(`/admin/feature-ideas/${id}`);
}

/**
 * Delete a feature idea (author or owner only)
 */
export async function deleteFeatureIdea(id: string) {
    const session = await requireAdmin();
    const idea = await db.featureIdea.findUnique({ where: { id } });
    if (!idea) throw new Error('Not found');

    if (idea.authorId !== session.user.id && session.user.role !== 'owner') {
        throw new Error('Only the author or owner can delete this idea');
    }

    await db.featureIdea.delete({ where: { id } });
    revalidateIdeas();
}

/**
 * Update idea status (any admin)
 */
export async function updateFeatureIdeaStatus(id: string, status: FeatureIdeaStatus) {
    await requireAdmin();
    await db.featureIdea.update({ where: { id }, data: { status } });
    revalidateIdeas();
    revalidatePath(`/admin/feature-ideas/${id}`);
}

/**
 * Toggle upvote for current user
 */
export async function toggleUpvote(ideaId: string) {
    const session = await requireAdmin();
    const existing = await db.featureIdeaUpvote.findUnique({
        where: { userId_ideaId: { userId: session.user.id, ideaId } },
    });

    if (existing) {
        await db.featureIdeaUpvote.delete({ where: { id: existing.id } });
    } else {
        await db.featureIdeaUpvote.create({
            data: { userId: session.user.id, ideaId },
        });
    }

    revalidateIdeas();
    revalidatePath(`/admin/feature-ideas/${ideaId}`);
}

/**
 * Add a comment to an idea
 */
export async function addIdeaComment(ideaId: string, content: string) {
    const session = await requireAdmin();

    await db.featureIdeaComment.create({
        data: {
            content,
            authorId: session.user.id,
            ideaId,
        },
    });

    revalidateIdeas();
    revalidatePath(`/admin/feature-ideas/${ideaId}`);
}
