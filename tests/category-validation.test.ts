/**
 * Unit tests for category validation schema (CR8 CUSTOM-1).
 *
 * Covers:
 *  - Optional description accepted when missing or empty
 *  - Description at the 280-char boundary accepted
 *  - Description over 280 chars rejected
 *  - Empty description transforms to undefined (so DB stores NULL, not "")
 *  - Name/color invariants still enforced alongside description
 */

import { describe, it, expect } from 'vitest';
import { categorySchema } from '@/lib/validations/category';

describe('categorySchema — description field', () => {
  const validBase = { name: 'General', color: '#D94A4A' };

  it('accepts a category without a description (optional)', () => {
    const result = categorySchema.safeParse(validBase);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  it('accepts a description at the 280-char boundary', () => {
    const desc = 'a'.repeat(280);
    const result = categorySchema.safeParse({ ...validBase, description: desc });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe(desc);
    }
  });

  it('rejects a description over 280 characters', () => {
    const desc = 'a'.repeat(281);
    const result = categorySchema.safeParse({ ...validBase, description: desc });
    expect(result.success).toBe(false);
  });

  it('transforms an empty description to undefined', () => {
    const result = categorySchema.safeParse({ ...validBase, description: '   ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });

  it('rejects an invalid color even when description is valid', () => {
    const result = categorySchema.safeParse({
      name: 'X',
      color: 'not-a-color',
      description: 'ok',
    });
    expect(result.success).toBe(false);
  });
});
