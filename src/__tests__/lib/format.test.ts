import { formatPhone } from '@/lib/format';

describe('formatPhone', () => {
  it('returns empty string unchanged', () => {
    expect(formatPhone('')).toBe('');
  });

  it('formats international number with country code', () => {
    expect(formatPhone('+4917670205191')).toBe('+49 176 70205191');
  });

  it('strips internal spaces before formatting', () => {
    expect(formatPhone('+49 176 70205191')).toBe('+49 176 70205191');
  });

  it('formats local German number starting with 0', () => {
    expect(formatPhone('017670205191')).toBe('0176 70205191');
  });

  it('returns short local number unchanged if under 5 chars', () => {
    expect(formatPhone('0123')).toBe('0123');
  });

  it('returns non-standard number unchanged', () => {
    expect(formatPhone('12345')).toBe('12345');
  });

  it('handles international number with short rest', () => {
    // +49 + 2-digit cc + 2-digit rest → no space split
    expect(formatPhone('+4912')).toBe('+4912');
  });
});
