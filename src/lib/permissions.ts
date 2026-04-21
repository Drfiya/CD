/**
 * Role hierarchy and permission helpers for admin and moderation features.
 *
 * Role hierarchy: Owner > Admin > Moderator > Member
 *
 * - Owner: Full control, can manage all roles, cannot be demoted
 * - Admin: Can moderate content, manage members, edit settings
 * - Moderator: Can moderate content only
 * - Member: Standard user, no moderation powers
 */

export type Role = 'owner' | 'admin' | 'moderator' | 'member';

/**
 * Role hierarchy levels - higher number = more authority
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  member: 1,
};

/**
 * Check if a role is valid
 */
export function isValidRole(role: string): role is Role {
  return role in ROLE_HIERARCHY;
}

/**
 * Check if actor role can manage (promote/demote/ban) target role.
 * A role can only manage roles strictly below it in hierarchy.
 * Owner cannot be managed by anyone.
 */
export function canManageRole(actorRole: string, targetRole: string): boolean {
  if (!isValidRole(actorRole) || !isValidRole(targetRole)) {
    return false;
  }

  // Owner cannot be managed by anyone
  if (targetRole === 'owner') {
    return false;
  }

  // Actor must be strictly higher in hierarchy
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Check if user can moderate content (delete posts/comments, warn users).
 * Requires moderator role or higher.
 */
export function canModerateContent(role: string): boolean {
  if (!isValidRole(role)) {
    return false;
  }
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.moderator;
}

/**
 * Check if user can manage members (ban, change roles up to their level - 1).
 * Requires admin role or higher.
 */
export function canManageMembers(role: string): boolean {
  if (!isValidRole(role)) {
    return false;
  }
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

/**
 * Check if user can edit community settings.
 * Requires admin role or higher.
 */
export function canEditSettings(role: string): boolean {
  if (!isValidRole(role)) {
    return false;
  }
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin;
}

/**
 * Check if user has at least the specified role level.
 */
export function hasMinimumRole(userRole: string, minimumRole: Role): boolean {
  if (!isValidRole(userRole)) {
    return false;
  }
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Get the highest role that an actor can assign to others.
 * Returns the role one level below the actor's role.
 */
export function getMaxAssignableRole(actorRole: string): Role | null {
  if (!isValidRole(actorRole)) {
    return null;
  }

  const actorLevel = ROLE_HIERARCHY[actorRole];

  // Find the highest role with level < actorLevel
  const assignableRoles = (Object.entries(ROLE_HIERARCHY) as [Role, number][])
    .filter(([, level]) => level < actorLevel)
    .sort(([, a], [, b]) => b - a);

  return assignableRoles[0]?.[0] ?? null;
}

/**
 * Compare two roles. Returns:
 * - positive if roleA > roleB
 * - negative if roleA < roleB
 * - zero if equal or invalid
 */
export function compareRoles(roleA: string, roleB: string): number {
  if (!isValidRole(roleA) || !isValidRole(roleB)) {
    return 0;
  }
  return ROLE_HIERARCHY[roleA] - ROLE_HIERARCHY[roleB];
}
