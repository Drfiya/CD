'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { dmConversationChannel } from '@/lib/dm-realtime';
import { sendMessage, markConversationRead } from '@/lib/message-actions';
import { blockUser, unblockUser } from '@/lib/dm-block-actions';
import { getConversation } from '@/lib/conversation-actions';
import { requestAttachmentUploadUrl } from '@/lib/dm-attachment-actions';
import type { AttachmentMetadata } from '@/lib/validations/dm';
import { MessageBubble } from './message-bubble';
import { MessageInput, type MessageInputHandle } from './message-input';
import { EmojiPickerButton } from './emoji-picker-button';
import { AttachmentUploader } from './attachment-uploader';
import {
  ConnectionBanner,
  mapRealtimeStatus,
  type RealtimeStatus,
} from './connection-banner';
import {
  createConnectionGrace,
  type ConnectionGraceHandle,
} from './connection-grace';
import {
  upsertIncoming,
  mergeRefetch,
  type ChatMessage as ReconcileChatMessage,
} from './message-reconcile';
import {
  MAX_MESSAGE_BODY_LENGTH,
  DM_ATTACHMENT_ALLOWED_MIMES,
  DM_ATTACHMENT_MAX_BYTES,
} from '@/lib/validations/dm';
import type { Messages } from '@/lib/i18n/messages/en';

type ChatMessage = ReconcileChatMessage;

interface ChatWindowProps {
  conversationId: string;
  otherUser: { id: string; name: string | null; image: string | null };
  initialMessages: ChatMessage[];
  canSend: boolean;
  iBlocked: boolean;
  theyBlocked: boolean;
  messages: Messages['dm'];
}

function generateClientId(): string {
  // Prefer crypto.randomUUID when available (all modern browsers + Node 18+)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type DragFileResult = 'ok' | 'type_error' | 'size_error';

function validateDragFile(file: File): DragFileResult {
  if (!(DM_ATTACHMENT_ALLOWED_MIMES as readonly string[]).includes(file.type)) {
    return 'type_error';
  }
  if (file.size > DM_ATTACHMENT_MAX_BYTES) return 'size_error';
  return 'ok';
}

export function ChatWindow({
  conversationId,
  otherUser,
  initialMessages,
  canSend: initialCanSend,
  iBlocked: initialIBlocked,
  theyBlocked: initialTheyBlocked,
  messages: t,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id ?? null;
  const router = useRouter();

  const [msgs, setMsgs] = useState<ChatMessage[]>(initialMessages);
  const [iBlocked, setIBlocked] = useState(initialIBlocked);
  // theyBlocked is captured at mount from server props. The parent uses
  // `key={conversationId}` so a re-navigation re-mounts this component with
  // a fresh server fetch — no client-side mutation needed here.
  const theyBlocked = initialTheyBlocked;
  const canSend = initialCanSend && !iBlocked && !theyBlocked;
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [, startTransition] = useTransition();
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  // Round 3 / A2 — banner visibility is gated behind a 500 ms grace period so
  // fast-subscribing channels never flash "Connecting…". The grace helper owns
  // the timer; the component just subscribes to its `onVisibleChange` callback.
  const [bannerVisible, setBannerVisible] = useState(false);
  const graceRef = useRef<ConnectionGraceHandle | null>(null);
  // Round 3 / Item 5 — upload orchestration state lives here (not in the
  // uploader child) so doSend() can coordinate upload → sendMessage.
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Round 4 / Item 1 — drag-and-drop
  const dragCounter = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  // Round 4 / Item 2 — emoji picker inserts text at cursor via this ref
  const messageInputRef = useRef<MessageInputHandle | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const lastSeenCreatedAtRef = useRef<string | null>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt.toISOString() : null,
  );

  // Note: parent applies `key={conversationId}` to force a fresh mount when
  // switching conversations, so we intentionally do NOT sync props→state here.

  // Auto-scroll to bottom on message list changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // Mark conversation as read on mount and on any incoming message.
  // The UnreadBadge + ConversationList listen to the DM_READ_EVENT broadcast
  // fired from `markConversationRead` — surgical live update, no layout-wide
  // RSC revalidation triggered by opening a conversation.
  useEffect(() => {
    void markConversationRead({ conversationId });
  }, [conversationId]);

  // Round 3 / A2 — install the connection-banner grace helper once on mount.
  // Re-mount happens on conversationId change via parent `key` prop, so tying
  // lifecycle to `[]` is the right scope.
  useEffect(() => {
    const grace = createConnectionGrace({
      delayMs: 500,
      onVisibleChange: setBannerVisible,
    });
    graceRef.current = grace;
    // Initial status is `'connecting'` (state default) — arm the first timer.
    grace.setStatus('connecting');
    return () => {
      grace.stop();
      graceRef.current = null;
    };
  }, []);

  // Forward every Realtime status change into the grace helper.
  useEffect(() => {
    graceRef.current?.setStatus(realtimeStatus);
  }, [realtimeStatus]);

  // Realtime subscription: INSERTs + UPDATEs on the conversation's Message rows
  useEffect(() => {
    if (!myId) return;
    const supabase = createClient();

    function upsertFromRow(row: unknown) {
      // Supabase payloads use snake_case for Postgres column names
      type Row = {
        id: string;
        conversation_id: string;
        sender_id: string;
        body: string;
        client_message_id: string | null;
        created_at: string;
        read_at: string | null;
        // Round 3 / Item 5 — attachment fields arrive via the same Postgres
        // Changes payload. Round-trip them so MessageBubble can render without
        // an extra refetch.
        attachment_path: string | null;
        attachment_mime: string | null;
        attachment_size: number | null;
        attachment_name: string | null;
      };
      const r = row as Row;
      if (r.conversation_id !== conversationId) return;
      const incoming: ChatMessage = {
        id: r.id,
        conversationId: r.conversation_id,
        senderId: r.sender_id,
        body: r.body,
        clientMessageId: r.client_message_id,
        createdAt: new Date(r.created_at),
        readAt: r.read_at ? new Date(r.read_at) : null,
        attachmentPath: r.attachment_path,
        attachmentMime: r.attachment_mime,
        attachmentSize: r.attachment_size,
        attachmentName: r.attachment_name,
      };
      lastSeenCreatedAtRef.current = r.created_at;

      setMsgs((prev) => upsertIncoming(prev, incoming));

      // If the new row came from the other user, mark as read right away
      if (incoming.senderId !== myId) {
        void markConversationRead({ conversationId });
      }
    }

    const channel = supabase
      .channel(dmConversationChannel(conversationId))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => upsertFromRow(payload.new),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Message',
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => upsertFromRow(payload.new),
      )
      .subscribe(async (status) => {
        // Surface connection state to the user (A1 — Connection Banner).
        const mapped = mapRealtimeStatus(status);
        if (mapped !== null) setRealtimeStatus(mapped);

        // Reconnect safety — on (re)subscribe, fetch anything we might have
        // missed. Dedupe is owned by `mergeRefetch` + `upsertIncoming`.
        if (status === 'SUBSCRIBED') {
          const since = lastSeenCreatedAtRef.current;
          const result = await getConversation(conversationId, { limit: 100 });
          if ('error' in result) return;
          const fresh: ChatMessage[] = result.messages.map((m) => ({
            id: m.id,
            conversationId: m.conversationId,
            senderId: m.senderId,
            body: m.body,
            clientMessageId: m.clientMessageId,
            createdAt: new Date(m.createdAt),
            readAt: m.readAt ? new Date(m.readAt) : null,
            attachmentPath: m.attachmentPath ?? null,
            attachmentMime: m.attachmentMime ?? null,
            attachmentSize: m.attachmentSize ?? null,
            attachmentName: m.attachmentName ?? null,
          }));
          setMsgs((prev) => mergeRefetch(prev, fresh, since));
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, myId]);

  /**
   * Round 3 / Item 5 — upload a queued File via the signed upload URL issued
   * by `requestAttachmentUploadUrl`. Returns the metadata to pass to
   * `sendMessage`, or `null` on any failure (toast already surfaced).
   */
  const uploadAttachment = useCallback(
    async (file: File): Promise<AttachmentMetadata | null> => {
      const req = await requestAttachmentUploadUrl({
        conversationId,
        filename: file.name,
        mime: file.type,
        size: file.size,
      });
      if ('error' in req) {
        const errMsg = typeof req.error === 'string' ? req.error : '';
        if (errMsg === 'rate_limited') {
          const seconds =
            'retryAfterSec' in req && typeof req.retryAfterSec === 'number'
              ? req.retryAfterSec
              : 1;
          toast.error(t.rateLimitedWithSeconds.replace('{seconds}', String(seconds)));
        } else if (errMsg.includes('type') || errMsg.includes('mime')) {
          toast.error(t.attachmentInvalidType);
        } else if (errMsg.includes('limit') || errMsg.includes('large')) {
          toast.error(t.attachmentTooLarge.replace('{mb}', '10'));
        } else {
          toast.error(t.attachmentUploadFailed);
        }
        return null;
      }

      // Upload via the signed URL. Supabase JS returns a signed upload URL
      // that accepts a PUT with raw bytes; we use `fetch` to stay decoupled
      // from any SDK version-specific helper.
      try {
        const putResponse = await fetch(req.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putResponse.ok) {
          throw new Error(`Upload PUT failed: ${putResponse.status}`);
        }
      } catch (err) {
        console.error('[dm] attachment upload failed:', err);
        toast.error(t.attachmentUploadFailed);
        return null;
      }

      return {
        path: req.path,
        mime: file.type as AttachmentMetadata['mime'],
        size: file.size,
        name: req.sanitisedName,
      };
    },
    [conversationId, t],
  );

  const doSend = useCallback(
    async (body: string) => {
      if (!myId || !canSend) return;
      const file = attachedFile;
      // Must have EITHER a body OR an attachment — UI should prevent this,
      // but server also enforces the same rule in Zod.
      if (!body && !file) return;

      let attachmentMeta: AttachmentMetadata | null = null;
      if (file) {
        setIsUploading(true);
        try {
          attachmentMeta = await uploadAttachment(file);
        } finally {
          setIsUploading(false);
        }
        if (!attachmentMeta) {
          // Upload failed — keep the file in the preview so the user can retry.
          return;
        }
      }

      const clientMessageId = generateClientId();
      const optimistic: ChatMessage = {
        id: `optimistic-${clientMessageId}`,
        conversationId,
        senderId: myId,
        body,
        clientMessageId,
        createdAt: new Date(),
        readAt: null,
        isPending: true,
        attachmentPath: attachmentMeta?.path ?? null,
        attachmentMime: attachmentMeta?.mime ?? null,
        attachmentSize: attachmentMeta?.size ?? null,
        attachmentName: attachmentMeta?.name ?? null,
      };
      setMsgs((prev) => [...prev, optimistic]);
      // Attachment has been consumed by the optimistic row — clear the chip.
      if (file) setAttachedFile(null);

      const result = await sendMessage({
        conversationId,
        body,
        clientMessageId,
        attachment: attachmentMeta ?? undefined,
      });
      if ('error' in result) {
        setMsgs((prev) =>
          prev.map((m) =>
            m.clientMessageId === clientMessageId ? { ...m, isPending: false, isFailed: true } : m,
          ),
        );
        if (result.error === 'rate_limited') {
          // Round 3 / A4 — surface the exact retry-after to the user instead of a generic
          // "slow down" string. The server guarantees `retryAfterSec >= 1`; the `?? 1`
          // is only a TS narrow — the union includes a generic `{ error: string }` from
          // Zod validation that doesn't carry the field.
          const seconds =
            'retryAfterSec' in result && typeof result.retryAfterSec === 'number'
              ? result.retryAfterSec
              : 1;
          toast.error(t.rateLimitedWithSeconds.replace('{seconds}', String(seconds)));
        } else {
          toast.error(t.sendFailed);
        }
        return;
      }
      // Happy path: replace the optimistic row with the server row
      setMsgs((prev) =>
        prev.map((m) =>
          m.clientMessageId === clientMessageId
            ? {
                id: result.message.id,
                conversationId: result.message.conversationId,
                senderId: result.message.senderId,
                body: result.message.body,
                clientMessageId: result.message.clientMessageId,
                createdAt: new Date(result.message.createdAt),
                readAt: result.message.readAt ? new Date(result.message.readAt) : null,
                attachmentPath: result.message.attachmentPath,
                attachmentMime: result.message.attachmentMime,
                attachmentSize: result.message.attachmentSize,
                attachmentName: result.message.attachmentName,
              }
            : m,
        ),
      );
      lastSeenCreatedAtRef.current = new Date(result.message.createdAt).toISOString();
    },
    [attachedFile, canSend, conversationId, myId, t, uploadAttachment],
  );

  const handleRetry = useCallback(
    (failedMsg: ChatMessage) => {
      setMsgs((prev) => prev.filter((m) => m.clientMessageId !== failedMsg.clientMessageId));
      void doSend(failedMsg.body);
    },
    [doSend],
  );

  const handleBlock = useCallback(() => {
    startTransition(async () => {
      const result = await blockUser({ targetUserId: otherUser.id });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setIBlocked(true);
      setConfirmingBlock(false);
      // `router.push` is navigation, not a layout revalidation — legitimate
      // per Round 2 / A2. The server-side `revalidatePath('/messages')` in
      // `blockUser` already invalidates the inbox RSC cache.
      router.push('/messages');
    });
  }, [otherUser.id, router]);

  const handleUnblock = useCallback(() => {
    startTransition(async () => {
      const result = await unblockUser({ targetUserId: otherUser.id });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setIBlocked(false);
    });
  }, [otherUser.id]);

  // Round 4 / Item 1 — drag-and-drop. Counter-based enter/leave tracking
  // prevents false negatives when the pointer moves over child elements.
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSend) return;
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragOver(true);
  }, [canSend]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = Math.max(0, dragCounter.current - 1);
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (!canSend) return;
    const file = e.dataTransfer.files.item(0);
    if (!file) return;
    const result = validateDragFile(file);
    if (result === 'type_error') {
      toast.error(t.attachmentInvalidType);
      return;
    }
    if (result === 'size_error') {
      toast.error(t.attachmentTooLarge.replace('{mb}', '10'));
      return;
    }
    setAttachedFile(file);
  }, [canSend, t]);

  const disabledReason = useMemo(() => {
    if (iBlocked) return t.youBlockedThisUser;
    if (theyBlocked) return t.theyBlockedYou;
    return null;
  }, [iBlocked, theyBlocked, t]);

  return (
    <div
      className="relative flex flex-col h-full min-h-0"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Round 4 / Item 1 — drag-over overlay. Scoped to the chat surface,
          pointer-events-none so it doesn't capture mouse events. */}
      {isDragOver && canSend && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-50 flex items-center justify-center rounded-md ring-2 ring-inset ring-primary bg-primary/10 pointer-events-none"
        >
          <span className="text-sm font-medium text-primary select-none px-4 text-center">
            {t.dropFileToAttach}
          </span>
        </div>
      )}
      {/* Chat header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link
          href="/messages"
          className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={t.backToInbox}
        >
          <span aria-hidden>←</span>
        </Link>
        <Link
          href={`/members/${otherUser.id}`}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
        >
          <Avatar src={otherUser.image} name={otherUser.name} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {otherUser.name ?? 'Unknown'}
            </p>
          </div>
        </Link>
        {iBlocked ? (
          <button
            type="button"
            onClick={handleUnblock}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {t.unblock}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingBlock(true)}
            className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive rounded"
          >
            {t.block}
          </button>
        )}
      </header>

      {/* Connection-state banner — unobtrusive 1-liner while the Realtime
          channel is not SUBSCRIBED. No toast, no modal — lives IN the surface.
          Round 3 / A2 — rendered only after a 500 ms grace period; see
          `connection-grace.ts`. Fast-subscribing channels produce zero flash. */}
      {bannerVisible && (
        <ConnectionBanner
          status={realtimeStatus}
          messages={{ connecting: t.connecting, reconnecting: t.reconnecting }}
        />
      )}



      {/* Block confirmation (lightweight inline dialog — no external deps) */}
      {confirmingBlock && (
        <div
          role="alertdialog"
          aria-labelledby="dm-block-title"
          aria-describedby="dm-block-body"
          className="border-b border-border bg-destructive/5 px-4 py-3"
        >
          <p id="dm-block-title" className="text-sm font-semibold text-foreground">
            {t.confirmBlockTitle}
          </p>
          <p id="dm-block-body" className="text-xs text-muted-foreground mt-1">
            {t.confirmBlockBody}
          </p>
          <div className="mt-3 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setConfirmingBlock(false)}
              className="h-8 px-3 rounded-md text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleBlock}
              className="h-8 px-3 rounded-md text-xs font-medium bg-destructive text-primary-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2"
            >
              {t.block}
            </button>
          </div>
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-4 space-y-2 bg-background"
        aria-live="polite"
      >
        {msgs.map((m) => (
          <MessageBubble
            key={m.clientMessageId ?? m.id}
            messageId={m.id.startsWith('optimistic-') ? undefined : m.id}
            body={m.body}
            isMine={m.senderId === myId}
            isPending={m.isPending}
            isFailed={m.isFailed}
            onRetry={m.isFailed ? () => handleRetry(m) : undefined}
            createdAt={m.createdAt}
            readAt={m.readAt}
            attachment={
              m.attachmentPath && m.attachmentMime && m.attachmentSize !== null && m.attachmentSize !== undefined && m.attachmentName
                ? {
                    path: m.attachmentPath,
                    mime: m.attachmentMime,
                    size: m.attachmentSize,
                    name: m.attachmentName,
                  }
                : null
            }
            attachmentLabels={{
              download: t.attachmentDownload,
              openImage: t.attachmentOpenImage,
              imageAlt: (name) => t.attachmentImageAlt.replace('{name}', name),
              uploadFailed: t.attachmentUploadFailed,
              closeLightbox: t.cancel,
            }}
            deliveredAriaLabel={t.deliveredAriaLabel}
            readAriaLabel={t.readAriaLabel}
            retryLabel={t.retry}
            sendFailedLabel={t.sendFailed}
          />
        ))}
      </div>

      {/* Composer — Round 3 / Item 5: paperclip + preview chip live in the
          `attachmentSlot`, above the textarea. Send button is disabled while an
          upload is in flight and treats an attached file as a valid non-empty body.
          Round 4 / Item 2: emoji picker button in `emojiSlot`, between textarea and Send. */}
      <MessageInput
        ref={messageInputRef}
        onSend={doSend}
        disabled={!canSend}
        disabledReason={disabledReason}
        placeholder={t.newMessagePlaceholder}
        sendLabel={t.send}
        sendingLabel={t.sending}
        maxLength={MAX_MESSAGE_BODY_LENGTH}
        hasAttachment={attachedFile !== null}
        isUploading={isUploading}
        attachmentSlot={
          <div className="flex items-end gap-2">
            <AttachmentUploader
              value={attachedFile}
              onChange={setAttachedFile}
              disabled={!canSend}
              isUploading={isUploading}
              buttonLabel={t.attachmentButton}
              removeLabel={t.attachmentRemove}
              uploadingLabel={t.attachmentUploading}
              tooLargeMessage={(mb) => t.attachmentTooLarge.replace('{mb}', String(mb))}
              invalidTypeMessage={t.attachmentInvalidType}
              onValidationError={(msg) => toast.error(msg)}
            />
          </div>
        }
        emojiSlot={
          <EmojiPickerButton
            onEmojiSelect={(emoji) => messageInputRef.current?.insertAtCursor(emoji)}
            disabled={!canSend}
            ariaLabel={t.openEmojiPicker}
            closeLabel={t.closeEmojiPicker}
            theme="auto"
          />
        }
      />
      <p
        className={cn(
          'sr-only',
          // Accessibility: hint about Enter/Shift+Enter is read by screen readers.
        )}
      >
        Press Enter to send, Shift + Enter for a new line.
      </p>
    </div>
  );
}
