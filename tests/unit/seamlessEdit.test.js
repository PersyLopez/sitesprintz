import { describe, it, expect } from 'vitest';
import {
  annotateEditableMarkup,
  applyEditingVisibility,
  bindSeamlessEditing,
  editingSurface,
  startEditableSession,
  textLuminance,
} from '../../src/utils/seamlessEdit';

describe('annotateEditableMarkup', () => {
  it('tags hero copy and service cards with field paths', () => {
    document.body.innerHTML = `
      <div class="ss-live">
        <a class="ss-brand">Studio</a>
        <section data-ss-edit-type="hero">
          <p class="ss-eyebrow">Salon</p>
          <h1>Welcome</h1>
          <p class="ss-hero-sub">Subtitle</p>
          <a class="ss-btn">Book</a>
        </section>
        <section data-ss-edit-type="services">
          <h2 class="ss-h2">Our Services</h2>
          <article class="ss-card">
            <h3>Cut</h3>
            <p>A trim</p>
            <div class="ss-price">$45</div>
          </article>
        </section>
      </div>
    `;
    annotateEditableMarkup(document.querySelector('.ss-live'));
    expect(document.querySelector('.ss-brand').getAttribute('data-editable')).toBe('brand.name');
    expect(document.querySelector('h1').getAttribute('data-editable')).toBe('hero.title');
    expect(document.querySelector('.ss-hero-sub').getAttribute('data-editable')).toBe('hero.subtitle');
    expect(document.querySelector('.ss-card h3').getAttribute('data-editable')).toBe('services.items.0.name');
  });

  it('uses a dark plate behind light text so typed copy stays readable', () => {
    expect(textLuminance('rgb(244, 242, 238)')).toBeGreaterThan(0.8);
    expect(editingSurface('rgb(244, 242, 238)').background).toContain('12, 12, 14');
    expect(editingSurface('rgb(20, 20, 24)').background).toContain('255, 255, 255');
  });

  it('keeps computed text color while editing', () => {
    document.body.innerHTML = '<h1 style="color: rgb(244, 242, 238); background: #000;">Headline</h1>';
    const heading = document.querySelector('h1');
    applyEditingVisibility(heading);
    expect(heading.style.color).toBe('rgb(244, 242, 238)');
    expect(heading.style.backgroundColor).toContain('12, 12, 14');
    expect(heading.style.caretColor).toBe('rgb(244, 242, 238)');
  });

  it('does not select-all so existing and typed text stay visible', () => {
    document.body.innerHTML = '<h1 data-editable="hero.title">Welcome</h1>';
    const heading = document.querySelector('h1');
    startEditableSession(heading, () => {});
    expect(['true', 'plaintext-only']).toContain(heading.getAttribute('contenteditable'));
    expect(window.getSelection()?.toString() || '').not.toBe('Welcome');
  });

  it('skips form and cart sidebar markup inside ss-live', () => {
    document.body.innerHTML = `
      <div class="ss-live">
        <section data-ss-edit-type="hero">
          <h1>Welcome</h1>
          <form><input name="email" /></form>
        </section>
        <div class="cart-sidebar" data-testid="cart-sidebar"><h3>Cart</h3></div>
      </div>
    `;
    annotateEditableMarkup(document.querySelector('.ss-live'));
    expect(document.querySelector('h1').getAttribute('data-editable')).toBe('hero.title');
    expect(document.querySelector('form input')).not.toHaveAttribute('data-editable');
    expect(document.querySelector('.cart-sidebar h3')).not.toHaveAttribute('data-editable');
  });
});

describe('bindSeamlessEditing', () => {
  it('starts a session on data-editable clicks', () => {
    document.body.innerHTML = '<div class="ss-live"><h1 data-editable="hero.title">Welcome</h1></div>';
    const root = document.querySelector('.ss-live');
    const commits = [];
    bindSeamlessEditing(root, { onCommit: (change) => commits.push(change) });
    root.querySelector('h1').click();
    expect(root.querySelector('h1').getAttribute('contenteditable')).toBeTruthy();
    expect(commits).toHaveLength(0);
  });

  it('reports classify key for unbound phone and photo clicks', () => {
    document.body.innerHTML = `
      <div class="ss-live">
        <a data-testid="hero-phone" href="tel:555">555</a>
        <img src="/photo.jpg" alt="Hero" />
      </div>
    `;
    const root = document.querySelector('.ss-live');
    const unbound = [];
    bindSeamlessEditing(root, { onUnboundClick: (result) => unbound.push(result) });
    root.querySelector('[data-testid="hero-phone"]').click();
    root.querySelector('img').click();
    expect(unbound.map((item) => item.key)).toEqual(['settings', 'edit']);
  });

  it('opens a photo pick instead of text editing on sample inserts', () => {
    document.body.innerHTML = `
      <div class="ss-live">
        <section data-ss-edit-type="hero">
          <div class="ss-photo-placeholder" data-photo-field="hero.image" data-testid="photo-placeholder">
            <img class="ss-photo-placeholder-img" src="/assets/hero-placeholder.jpg" alt="" />
          </div>
        </section>
      </div>
    `;
    const root = document.querySelector('.ss-live');
    const picks = [];
    bindSeamlessEditing(root, {
      onPhotoPick: (payload) => picks.push(payload),
    });
    root.querySelector('[data-testid="photo-placeholder"]').click();
    expect(picks).toHaveLength(1);
    expect(picks[0].field).toBe('hero.image');
    expect(root.querySelector('[data-testid="photo-placeholder"]').getAttribute('contenteditable')).toBeNull();
  });
});
