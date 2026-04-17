'use server';

import db from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { requireAdmin } from '@/lib/auth-guards';

/**
 * Audit action types for tracking moderation activities.
 */
export type AuditAction =
  | 'BAN_USER'
  | 'UNBAN_USER'
  | 'EDIT_POST'
  | 'DELETE_POST'
  | 'EDIT_COMMENT'
  | 'DELETE_COMMENT'
  | 'CHANGE_ROLE'
  | 'UPDATE_SETTINGS'
  | 'WARN_USER';

export type AuditTargetType = 'USER' | 'POST' | 'COMMENT' | 'SETTINGS';

/**
 * Log an audit event for moderation tracking.
 *
 * The acting user (`userId` on the row) is always derived from the server
 * session — the caller cannot forge another user's audit entry. Only
 * admin/owner roles can write audit rows; moderator-class actions that must
 * be auditable should be hoisted into admin-only flows first.
 *
 * @param action - The type of action performed
 * @param options - Additional details about the action
 */
export async function logAuditEvent(
  action: AuditAction,
  options: {
    targetId?: string;
    targetType?: AuditTargetType;
    details?: Record<string, unknown>;
  } = {}
): Promise<void> {
  const session = await requireAdmin();
  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action,
      targetId: options.targetId ?? null,
      targetType: options.targetType ?? null,
      details: options.details
        ? (options.details as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

/**
 * Get audit logs with optional filtering.
 *
 * @param options - Filter options
 * @returns Array of audit log entries with user information
 */
export async function getAuditLogs(
  options: {
    userId?: string;
    action?: AuditAction;
    targetId?: string;
    targetType?: AuditTargetType;
    limit?: number;
    offset?: number;
  } = {}
): Promise<
  Array<{
    id: string;
    userId: string;
    action: string;
    targetId: string | null;
    targetType: string | null;
    details: unknown;
    createdAt: Date;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>
> {
  await requireAdmin();
  const where: Prisma.AuditLogWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }
  if (options.action) {
    where.action = options.action;
  }
  if (options.targetId) {
    where.targetId = options.targetId;
  }
  if (options.targetType) {
    where.targetType = options.targetType;
  }

  return db.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 50,
    skip: options.offset ?? 0,
    select: {
      id: true,
      userId: true,
      action: true,
      targetId: true,
      targetType: true,
      details: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get audit log count for pagination.
 */
export async function getAuditLogCount(
  options: {
    userId?: string;
    action?: AuditAction;
    targetId?: string;
    targetType?: AuditTargetType;
  } = {}
): Promise<number> {
  await requireAdmin();
  const where: Prisma.AuditLogWhereInput = {};

  if (options.userId) {
    where.userId = options.userId;
  }
  if (options.action) {
    where.action = options.action;
  }
  if (options.targetId) {
    where.targetId = options.targetId;
  }
  if (options.targetType) {
    where.targetType = options.targetType;
  }

  return db.auditLog.count({ where });
}
