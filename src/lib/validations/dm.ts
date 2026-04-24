import { z } from 'zod';

export const MAX_MESSAGE_BODY_LENGTH = 4000;

// Round 3 / Item 5 — File attachments (images + PDFs only).
export const DM_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB hard cap
export const DM_ATTACHMENT_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;
export type DmAttachmentMime = (typeof DM_ATTACHMENT_ALLOWED_MIMES)[number];

const userIdSchema = z
  .string()
  .min(1, 'User id is required')
  .max(64, 'User id too long');

export const startConversationSchema = z.object({
  otherUserId: userIdSchema,
});

/**
 * Attachment metadata passed from the client to `sendMessage` after the
 * upload has finalised. Every field is server-re-verified before the row is
 * written (`finaliseAttachment` in `dm-attachment-actions.ts`) — client-side
 * values are never persisted without a second check.
 */
export const attachmentMetadataSchema = z.object({
  path: z
    .string()
    .min(1, 'Attachment path is required')
    .max(512, 'Attachment path too long'),
  mime: z.enum(DM_ATTACHMENT_ALLOWED_MIMES),
  size: z
    .number()
    .int()
    .positive('Attachment size must be > 0')
    .max(DM_ATTACHMENT_MAX_BYTES, 'Attachment exceeds 10 MB limit'),
  name: z
    .string()
    .min(1, 'Attachment name is required')
    .max(255, 'Attachment name too long'),
});

export type AttachmentMetadata = z.infer<typeof attachmentMetadataSchema>;

/**
 * Round 3 / Item 5 — `body` is no longer mandatory when an attachment is
 * present. A message with only an image (empty body) is valid; a message
 * with neither body nor attachment is rejected by the final refine().
 */
export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1, 'Conversation id is required'),
    body: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .max(MAX_MESSAGE_BODY_LENGTH, `Message too long (max ${MAX_MESSAGE_BODY_LENGTH} characters)`),
      ),
    clientMessageId: z
      .string()
      .uuid()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    attachment: attachmentMetadataSchema.optional(),
  })
  .refine((input) => input.body.length > 0 || input.attachment !== undefined, {
    message: 'Message cannot be empty',
    path: ['body'],
  });

export const markReadSchema = z.object({
  conversationId: z.string().min(1),
});

export const blockUserSchema = z.object({
  targetUserId: userIdSchema,
});

/**
 * Round 3 / Item 5 — inputs for the attachment server actions. Declared here
 * alongside `attachmentMetadataSchema` so validation lives in one place.
 */
export const requestAttachmentUploadUrlSchema = z.object({
  conversationId: z.string().min(1, 'Conversation id is required'),
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long'),
  mime: z.enum(DM_ATTACHMENT_ALLOWED_MIMES),
  size: z
    .number()
    .int()
    .positive('Size must be > 0')
    .max(DM_ATTACHMENT_MAX_BYTES, 'File exceeds 10 MB limit'),
});

export const finaliseAttachmentSchema = z.object({
  conversationId: z.string().min(1),
  path: z.string().min(1).max(512),
  expectedMime: z.enum(DM_ATTACHMENT_ALLOWED_MIMES),
  expectedSize: z.number().int().positive().max(DM_ATTACHMENT_MAX_BYTES),
});

export const getAttachmentSignedUrlSchema = z.object({
  messageId: z.string().min(1, 'Message id is required'),
});

export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
export type BlockUserInput = z.infer<typeof blockUserSchema>;
export type RequestAttachmentUploadUrlInput = z.infer<
  typeof requestAttachmentUploadUrlSchema
>;
export type FinaliseAttachmentInput = z.infer<typeof finaliseAttachmentSchema>;
export type GetAttachmentSignedUrlInput = z.infer<
  typeof getAttachmentSignedUrlSchema
>;
