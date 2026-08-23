import { describe, it, expect } from 'vitest';
import {
  classifyUnboundLiveEditTarget,
  LIVE_EDIT_SCOPE_HINT,
  getUnboundHintForKey,
} from '../../src/utils/liveEditScope';

describe('classifyUnboundLiveEditTarget', () => {
  function mount(html) {
    document.body.innerHTML = html;
    return document.body;
  }

  it('returns null inside data-editable', () => {
    mount('<p data-editable="hero.title">Welcome</p>');
    expect(classifyUnboundLiveEditTarget(document.querySelector('p'))).toBeNull();
  });

  it('classifies photos as page builder edits', () => {
    mount('<div class="ss-live"><img src="/photo.jpg" alt="Hero" /></div>');
    const result = classifyUnboundLiveEditTarget(document.querySelector('img'));
    expect(result).toEqual({ key: 'edit', title: 'Photos, sections, FAQ, menu' });
  });

  it('classifies phone links as site settings', () => {
    mount('<a data-testid="hero-phone" href="tel:555">555</a>');
    const result = classifyUnboundLiveEditTarget(document.querySelector('a'));
    expect(result).toEqual({ key: 'settings', title: 'Phone, hours, address' });
    expect(getUnboundHintForKey('settings')).toMatch(/Site settings/);
  });

  it('classifies FAQ blocks as page builder edits', () => {
    mount('<section class="ss-faq"><h3>FAQ</h3></section>');
    const result = classifyUnboundLiveEditTarget(document.querySelector('h3'));
    expect(result?.key).toBe('edit');
  });

  it('classifies booking mounts as appointments', () => {
    mount('<div data-ss-booking-mount><button>Book</button></div>');
    const result = classifyUnboundLiveEditTarget(document.querySelector('button'));
    expect(result).toEqual({ key: 'appointments', title: 'Booking' });
  });

  it('returns null for unknown padding clicks', () => {
    mount('<div class="ss-live"><main></main></div>');
    expect(classifyUnboundLiveEditTarget(document.querySelector('main'))).toBeNull();
  });

  it('exports the toolbar hint copy', () => {
    expect(LIVE_EDIT_SCOPE_HINT).toMatch(/outlined text/i);
    expect(LIVE_EDIT_SCOPE_HINT).toMatch(/not edited here/i);
  });
});
