'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';
import {
  canManageMembers,
  canManageRole,
  canModerateContent,
  getMaxAssignableRole,
  isValidRole,
  ROLE_HIERARCHY,
  type Role,
} from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit-actions';
import type { Prisma } from '@/generated/prisma/client';
import { requireAdmin } from '@/lib/auth-guards';

const ADMIN_PAGE_SIZE = 20;

/**
 * Edit a post as admin/moderator (silent edit - no indicator shown to users).
 */
export async function editPostAsAdmin(postId: string, content: unknown) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canModerateContent(session.user.role)) {
    return { error: 'Not authorized' };
  }

  // Verify post exists
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { error: 'Post not found' };
  }

  // Update the post
  await db.post.update({
    where: { id: postId },
    data: {
      content: content as Prisma.InputJsonValue,
    },
  });

  // Log audit event
  await logAuditEvent('EDIT_POST', {
    targetId: postId,
    targetType: 'POST',
    details: {
      authorId: post.authorId,
    },
  });

  revalidatePath('/feed');
  revalidatePath(`/feed/${postId}`);
  revalidatePath('/admin/posts');

  return { success: true };
}

/**
 * Delete a post as admin/moderator (hard delete).
 */
export async function deletePostAsAdmin(postId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canModerateContent(session.user.role)) {
    return { error: 'Not authorized' };
  }

  // Verify post exists and get details for audit
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return { error: 'Post not found' };
  }

  // Hard delete the post
  await db.post.delete({
    where: { id: postId },
  });

  // Log audit event
  await logAuditEvent('DELETE_POST', {
    targetId: postId,
    targetType: 'POST',
    details: {
      authorId: post.authorId,
    },
  });

  revalidatePath('/feed');
  revalidatePath('/admin/posts');

  return { success: true };
}

/**
 * Edit a comment as admin/moderator (silent edit - no indicator shown to users).
 */
export async function editCommentAsAdmin(commentId: string, content: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canModerateContent(session.user.role)) {
    return { error: 'Not authorized' };
  }

  // Verify comment exists
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  // Validate content length
  if (!content || content.trim().length === 0) {
    return { error: 'Content cannot be empty' };
  }

  if (content.length > 2000) {
    return { error: 'Content exceeds maximum length of 2000 characters' };
  }

  // Update the comment
  await db.comment.update({
    where: { id: commentId },
    data: {
      content: content.trim(),
    },
  });

  // Log audit event
  await logAuditEvent('EDIT_COMMENT', {
    targetId: commentId,
    targetType: 'COMMENT',
    details: {
      authorId: comment.authorId,
      postId: comment.postId,
    },
  });

  revalidatePath(`/feed/${comment.postId}`);
  revalidatePath('/admin/comments');

  return { success: true };
}

/**
 * Delete a comment as admin/moderator (hard delete).
 */
export async function deleteCommentAsAdmin(commentId: string) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!canModerateContent(session.user.role)) {
    return { error: 'Not authorized' };
  }

  // Verify comment exists and get details for audit
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, postId: true },
  });

  if (!comment) {
    return { error: 'Comment not found' };
  }

  // Hard delete the comment
  await db.comment.delete({
    where: { id: commentId },
  });

  // Log audit event
  await logAuditEvent('DELETE_COMMENT', {
    targetId: commentId,
    targetType: 'COMMENT',
    details: {
      authorId: comment.authorId,
      postId: comment.postId,
    },
  });

  revalidatePath(`/feed/${comment.postId}`);
  revalidatePath('/admin/comments');

  return { success: true };
}

/**
 * Get paginated list of posts for moderation.
 */
export async function getPostsForModeration(
  page: number = 1,
  pageSize: number = ADMIN_PAGE_SIZE
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  if (!canModerateContent(session.user.role)) {
    throw new Error('Not authorized');
  }

  const skip = (page - 1) * pageSize;

  const [posts, totalCount] = await Promise.all([
    db.post.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    }),
    db.post.count(),
  ]);

  return {
    posts,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

/**
 * Get paginated list of comments for moderation.
 */
export async function getCommentsForModeration(
  page: number = 1,
  pageSize: number = ADMIN_PAGE_SIZE
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  if (!canModerateContent(session.user.role)) {
    throw new Error('Not authorized');
  }

  const skip = (page - 1) * pageSize;

  const [comments, totalCount] = await Promise.all([
    db.comment.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        content: true,
        createdAt: true,
        postId: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    }),
    db.comment.count(),
  ]);

  return {
    comments,
    totalCount,
    totalPages: Math.ceil(totalCount / pageSize),
    currentPage: page,
  };
}

// ============================================================================
// Member Management Actions (Admin+ only)
// ============================================================================

/**
 * Response type for admin member actions.
 */
type MemberActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * Ban a user for a specified duration. Deletes all their content.
 *
 * @param userId - ID of user to ban
 * @param reason - Reason for ban (visible to banned user)
 * @param durationDays - Ban duration: 1, 7, or 30 days
 */
export async function banUser(
  userId: string,
  reason: string,
  durationDays: 1 | 7 | 30
): Promise<MemberActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const actorRole = session.user.role;

  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Get target user
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found' };
  }

  // Cannot ban users at or above your role level
  if (!canManageRole(actorRole, targetUser.role)) {
    return {
      success: false,
      error: 'Cannot ban users at or above your role level',
    };
  }

  // Check if already banned
  const existingBan = await db.ban.findFirst({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (existingBan) {
    return { success: false, error: 'User is already banned' };
  }

  // Calculate expiry date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Create ban, delete content, and log audit
  await db.$transaction(async (tx) => {
    // Create ban record
    await tx.ban.create({
      data: {
        userId,
        reason,
        expiresAt,
        bannedById: session.user.id,
      },
    });

    // Delete user's posts (cascades to comments on those posts)
    await tx.post.deleteMany({ where: { authorId: userId } });

    // Delete user's comments on other posts
    await tx.comment.deleteMany({ where: { authorId: userId } });
  });

  // Log audit event
  await logAuditEvent('BAN_USER', {
    targetId: userId,
    targetType: 'USER',
    details: {
      reason,
      durationDays,
      expiresAt: expiresAt.toISOString(),
      targetEmail: targetUser.email,
      targetName: targetUser.name,
    },
  });

  revalidatePath('/admin/members');
  revalidatePath('/feed');
  return { success: true };
}

/**
 * Permanently remove a user from the community. Deletes their account and content.
 *
 * @param userId - ID of user to remove
 * @param reason - Reason for removal (stored in audit log)
 */
export async function removeUser(
  userId: string,
  reason: string
): Promise<MemberActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const actorRole = session.user.role;

  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  // Get target user
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found' };
  }

  // Cannot remove users at or above your role level
  if (!canManageRole(actorRole, targetUser.role)) {
    return {
      success: false,
      error: 'Cannot remove users at or above your role level',
    };
  }

  // Store user info for audit before deletion
  const userInfo = {
    email: targetUser.email,
    name: targetUser.name,
    role: targetUser.role,
  };

  // Delete user (cascades to posts, comments, likes, etc.)
  await db.user.delete({ where: { id: userId } });

  // Log audit event
  await logAuditEvent('BAN_USER', {
    targetId: userId,
    targetType: 'USER',
    details: {
      action: 'PERMANENT_REMOVAL',
      reason,
      ...userInfo,
    },
  });

  revalidatePath('/admin/members');
  revalidatePath('/feed');
  revalidatePath('/members');
  return { success: true };
}

/**
 * Change a user's role.
 *
 * @param userId - ID of user to update
 * @param newRole - New role to assign
 */
export async function changeUserRole(
  userId: string,
  newRole: Role
): Promise<MemberActionResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' };
  }

  const actorRole = session.user.role;

  if (!canManageMembers(actorRole)) {
    return { success: false, error: 'Insufficient permissions' };
  }

  if (!isValidRole(newRole)) {
    return { success: false, error: 'Invalid role' };
  }

  // Cannot assign roles at or above your level
  const maxAssignable = getMaxAssignableRole(actorRole);
  if (!maxAssignable || ROLE_HIERARCHY[newRole] > ROLE_HIERARCHY[maxAssignable]) {
    return {
      success: false,
      error: 'Cannot assign roles at or above your level',
    };
  }

  // Get target user
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, name: true },
  });

  if (!targetUser) {
    return { success: false, error: 'User not found' };
  }

  // Cannot modify users at or above your role level
  if (!canManageRole(actorRole, targetUser.role)) {
    return {
      success: false,
      error: 'Cannot modify users at or above your role level',
    };
  }

  // Cannot change your own role
  if (userId === session.user.id) {
    return { success: false, error: 'Cannot change your own role' };
  }

  const oldRole = targetUser.role;

  // Update role
  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // Log audit event
  await logAuditEvent('CHANGE_ROLE', {
    targetId: userId,
    targetType: 'USER',
    details: {
      oldRole,
      newRole,
      targetEmail: targetUser.email,
      targetName: targetUser.name,
    },
  });

  revalidatePath('/admin/members');
  return { success: true };
}

/**
 * Member data for admin list view.
 */
export interface AdminMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  points: number;
  level: number;
  createdAt: Date;
  activeBan: {
    id: string;
    reason: string;
    expiresAt: Date | null;
    createdAt: Date;
  } | null;
}

/**
 * Get paginated list of members for admin management.
 *
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of members per page
 */
export async function getMembersForAdmin(
  page: number = 1,
  pageSize: number = ADMIN_PAGE_SIZE
): Promise<{ members: AdminMember[]; total: number; totalPages: number }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { members: [], total: 0, totalPages: 0 };
  }

  if (!canManageMembers(session.user.role)) {
    return { members: [], total: 0, totalPages: 0 };
  }

  const skip = (page - 1) * pageSize;

  const [members, total] = await Promise.all([
    db.user.findMany({
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        points: true,
        level: true,
        createdAt: true,
        bans: {
          where: {
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            reason: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    }),
    db.user.count(),
  ]);

  return {
    members: members.map((m) => ({
      ...m,
      activeBan: m.bans[0] ?? null,
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Check if a user is currently banned.
 *
 * @param userId - ID of user to check
 * @returns true if user has an active ban
 */
export async function isUserBanned(userId: string): Promise<boolean> {
  await requireAdmin();
  const activeBan = await db.ban.findFirst({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  return activeBan !== null;
}
