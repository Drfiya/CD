import { cn } from '@/lib/utils';
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
}

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
  } = props;

  const timeStr = createdAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Render the attachment only for persisted rows (messageId present). During
  // the optimistic pre-ACK window the attachment preview lives in the
  // uploader chip, so suppressing it here avoids a double-render + a doomed
  // signed-URL fetch against a not-yet-existent row.
  const renderAttachment =
    attachment && attachmentLabels && messageId && !isPending;

  return (
    <div className={cn('flex w-full', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words',
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
              className={cn('select-none', readAt && 'text-blue-200')}
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
