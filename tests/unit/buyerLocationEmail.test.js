import { describe, it, expect } from 'vitest';
import { buyerLocationEmailRow, escapeEmailText } from '../../server/utils/buyerLocationEmail.js';

describe('buyerLocationEmailRow', () => {
  it('includes the escaped street on confirmed mail', () => {
    const html = buyerLocationEmailRow(false, '99 Hidden Ln <Unit 4B>');
    expect(html).toContain('Location');
    expect(html).toContain('99 Hidden Ln &lt;Unit 4B&gt;');
    expect(html).not.toContain('<Unit 4B>');
  });

  it('omits the street on pending-approval mail', () => {
    const html = buyerLocationEmailRow(true, '99 Hidden Ln Unit 4B');
    expect(html).toBe('');
  });

  it('omits an empty address', () => {
    expect(buyerLocationEmailRow(false, '')).toBe('');
    expect(escapeEmailText('a&b')).toBe('a&amp;b');
  });
});
