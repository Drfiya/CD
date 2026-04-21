export type NotificationType = 'COMMENT' | 'LIKE' | 'MENTION';

export interface NotificationActor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  actorId: string;
  actorName: string | null;
  actorImage: string | null;
  postId: string | null;
  commentId: string | null;
  isRead: boolean;
  createdAt: Date;
  /** All notification ids represented by this row.
   *  A single notification returns [id]; a collapsed group returns all member ids. */
  ids: string[];
  /** Total notifications in the group (>=1). 1 = not collapsed. */
  groupSize: number;
  /** Additional unique actors beyond the primary `actor*` fields, newest first.
   *  Used to render "Alice, Bob, and N others" patterns. Empty for singleton rows. */
  additionalActors: NotificationActor[];
}
