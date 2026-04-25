import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { formatMessageTimestamp } from '@/lib/dm-date-format';
import { renderMessageBody } from './autolink';
import { MessageAttachment } from './message-attachment';

export interface MessageBubbleAttachment {
  path: string;
  mime: string;
  size: number;
  name: string;
}

export interface MessageAttachmentLabels {
  download: string;
  openImage: string;
  imageAlt: (name: string) => string;
  uploadFailed: string;
  closeLightbox: string;
}

export interface MessageBubbleProps {
  /** Server id — needed for attachment signed-URL fetch. Undefined for optimistic rows. */
  messageId?: string;
  body: string;
  isMine: boolean;
  /** True when optimistic send hasn't been acknowledged by server yet. */
  isPending?: boolean;
  /** Populated after server acknowledgement so the client can show a retry UI. */
  isFailed?: boolean;
  onRetry?: () => void;
  /** Server-confirmed timestamp of the message. */
  createdAt: Date;
  /** When set and the message is mine, render a "read" indicator (double check). */
  readAt: Date | null;
  /** Round 3 / Item 5 — Attachment metadata (one per message, nullable). */
  attachment?: MessageBubbleAttachment | null;
  /** Labels for the attachment sub-component. Required when `attachment` is present. */
  attachmentLabels?: MessageAttachmentLabels;
  deliveredAriaLabel: string;
  readAriaLabel: string;
  retryLabel: string;
  sendFailedLabel: string;
  /** Round 5 / Item 1 — Smart timestamp labels. */
  messageDateToday: string;
  messageDateYesterday: string;
  /** Round 5 / Item 3 — Sender avatar. Passed from the parent so we don't re-fetch. */
  senderImage?: string | null;
  senderName?: string | null;
}

// Re-export so callers that historically imported from this file still work.
export { formatMessageTimestamp } from '@/lib/dm-date-format';

export function MessageBubble(props: MessageBubbleProps) {
  const {
    messageId,
    body,
    isMine,
    isPending,
    isFailed,
    onRetry,
    createdAt,
    readAt,
    attachment,
    attachmentLabels,
    deliveredAriaLabel,
    readAriaLabel,
    retryLabel,
    sendFailedLabel,
    messageDateToday,
    messageDateYesterday,
    senderImage,
    senderName,
  } = props;

  const timeStr = formatMessageTimestamp(createdAt, messageDateToday, messageDateYesterday);

  // Render the attachment only for persisted rows (messageId present). During
  // the optimistic pre-ACK window the attachment preview lives in the
  // uploader chip, so suppressing it here avoids a double-render + a doomed
  // signed-URL fetch against a not-yet-existent row.
  const renderAttachment =
    attachment && attachmentLabels && messageId && !isPending;

  return (
    <div className={cn('flex items-end gap-1.5 w-full', isMine && 'flex-row-reverse')}>
      <div className="shrink-0">
        <Avatar src={senderImage} name={senderName} size="sm" />
      </div>
      <div
        className={cn(
          'max-w-[72%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
          isMine
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm',
          isPending && 'opacity-60',
          isFailed && 'opacity-80 ring-1 ring-destructive',
        )}
      >
        {renderAttachment && (
          <MessageAttachment
            messageId={messageId}
            mime={attachment.mime}
            size={attachment.size}
            name={attachment.name}
            labels={attachmentLabels}
          />
        )}
        {body.length > 0 && <div>{renderMessageBody(body)}</div>}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px] font-medium',
            isMine ? 'justify-end text-primary-foreground/70' : 'text-muted-foreground',
          )}
        >
          <time dateTime={createdAt.toISOString()}>{timeStr}</time>
          {isMine && !isFailed && !isPending && (
            <span
              aria-label={readAt ? readAriaLabel : deliveredAriaLabel}
              title={readAt ? readAriaLabel : deliveredAriaLabel}
              className={cn('select-none', readAt && 'text-dm-read-check')}
            >
              {readAt ? '✓✓' : '✓'}
            </span>
          )}
          {isFailed && (
            <button
              type="button"
              onClick={onRetry}
              className="underline hover:no-underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded"
            >
              {onRetry ? retryLabel : sendFailedLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
