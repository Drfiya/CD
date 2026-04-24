import { describe, it, expect } from 'vitest';
import { sendMessageSchema, MAX_MESSAGE_BODY_LENGTH } from '@/lib/validations/dm';

describe('sendMessageSchema', () => {
  it('trims whitespace from the body', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: '   hello world   ',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body).toBe('hello world');
  });

  it('rejects empty bodies (after trim)', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: '   \n\t  ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects bodies exceeding MAX_MESSAGE_BODY_LENGTH', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'a'.repeat(MAX_MESSAGE_BODY_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('accepts bodies exactly at MAX_MESSAGE_BODY_LENGTH', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'a'.repeat(MAX_MESSAGE_BODY_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it('accepts a valid UUID clientMessageId', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'hi',
      clientMessageId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed clientMessageId', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: 'conv1',
      body: 'hi',
      clientMessageId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('requires a conversationId', () => {
    const result = sendMessageSchema.safeParse({ conversationId: '', body: 'hi' });
    expect(result.success).toBe(false);
  });
});
