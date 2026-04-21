/**
 * Shared stair-step `top-*` offsets for gamification celebration toasts.
 *
 * When a single user action (comment, post, lesson complete, like) can fire
 * multiple toasts in the same frame, they must render at distinct heights or
 * they fuse into an illegible blob. The project-wide convention — documented
 * in `directives/common_issues.md` and the Examiner feedback memories — is a
 * consistent stair-step so the order-of-importance is preserved by eye:
 *
 *   points-float → level-burst → streak-pop → badge-pop → streak-saved
 *
 * Different consumer components use different magnitude offsets depending on
 * their layout (comment-section's send button lives at the bottom of the
 * input, so offsets are NEGATIVE; create-post-modal's submit lives at the top
 * of its panel, so offsets are POSITIVE). Each preset below keeps the
 * relative ordering stable.
 */

export const COMMENT_TOAST_OFFSETS = {
  /** +2 pts */
  points: '-top-5',
  /** Level N! */
  level: '-top-9',
  /** N-day streak! (milestone) */
  streak: '-top-12',
  /** Badge unlocked: N */
  badge: '-top-14',
  /** N-day streak saved! (freeze token) */
  streakSaved: '-top-16',
} as const;

export const CREATE_POST_TOAST_OFFSETS = {
  streak: 'top-2',
  streakSaved: 'top-5',
  badge: 'top-8',
} as const;

export const MARK_COMPLETE_TOAST_OFFSETS = {
  streak: '-top-8',
  badge: '-top-10',
  streakSaved: '-top-12',
} as const;
