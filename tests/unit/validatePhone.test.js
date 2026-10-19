import { describe, expect, it } from 'vitest';
import { validatePhone } from '../../server/utils/validators.js';

describe('validatePhone', () => {
  it('accepts a parenthesized local number', () => {
    expect(validatePhone('(201) 555-0123')).toEqual({
      valid: true,
      value: '(201) 555-0123',
    });
  });

  it('accepts a dotted or international number', () => {
    expect(validatePhone('201.555.0123').valid).toBe(true);
    expect(validatePhone('+1 (201) 555-0123').valid).toBe(true);
    expect(validatePhone('020 7946 0958').valid).toBe(true);
  });

  it('rejects a number that is too short or not a phone', () => {
    expect(validatePhone('123').valid).toBe(false);
    expect(validatePhone('call-me').valid).toBe(false);
    expect(validatePhone('--------').valid).toBe(false);
  });
});
