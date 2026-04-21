/**
 * Single source of truth for "is this profile complete?"
 * Used by:
 *  - ProfileCompleteNudge widget (right sidebar) — hides when complete
 *  - Activation wizard + WELCOME badge checker — requires bio + image
 *
 * Both A4 (widget) and B1 (wizard) must agree on what "complete" means.
 */

export interface ProfileCompletenessInput {
  name: string | null | undefined;
  bio: string | null | undefined;
  image: string | null | undefined;
}

export function hasName(user: ProfileCompletenessInput): boolean {
  return !!user.name?.trim();
}

export function hasBio(user: ProfileCompletenessInput): boolean {
  return !!user.bio?.trim();
}

export function hasAvatar(user: ProfileCompletenessInput): boolean {
  return !!user.image?.trim();
}

/**
 * Profile is complete when name + bio + avatar are all set.
 * The widget hides and the activation checklist marks the profile step done
 * based on this single predicate.
 */
export function isProfileComplete(user: ProfileCompletenessInput): boolean {
  return hasName(user) && hasBio(user) && hasAvatar(user);
}

/**
 * Count how many of the 3 signals the user has completed.
 * Used for the "N/3 steps complete" progress indicator in the nudge widget.
 */
export function profileCompletionCount(user: ProfileCompletenessInput): number {
  return [hasName(user), hasBio(user), hasAvatar(user)].filter(Boolean).length;
}
