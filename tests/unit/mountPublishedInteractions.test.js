import { describe, expect, it } from 'vitest';
import { mountPublishedInteractions } from '../../src/utils/mountPublishedInteractions.js';

describe('mountPublishedInteractions', () => {
  it('answers a ZIP check after the page HTML is inserted', () => {
    document.body.innerHTML = `
      <form data-type="zip-check" data-areas="07030" data-ranges="10001-10005" data-covered="We serve your area." data-outside="We do not serve that area yet.">
        <p data-ss-zip-result></p>
        <input name="zip" />
      </form>`;
    mountPublishedInteractions(document);
    const input = document.querySelector('input[name="zip"]');
    const result = document.querySelector('[data-ss-zip-result]');
    input.value = '07030';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(result.textContent).toBe('We serve your area.');
    input.value = '10003';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(result.textContent).toBe('We serve your area.');
    input.value = '90210';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(result.textContent).toBe('We do not serve that area yet.');
  });

  it('adds a package total when a box is checked', () => {
    document.body.innerHTML = `
      <form data-type="package-quote">
        <p data-ss-package-total></p>
        <input type="checkbox" data-price="40" />
        <input type="checkbox" data-price="15" />
      </form>`;
    mountPublishedInteractions(document);
    const [first, second] = document.querySelectorAll('input');
    first.checked = true;
    second.checked = true;
    first.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector('[data-ss-package-total]').textContent).toBe('Estimated total $55');
  });

  it('hides filter items that do not match', () => {
    document.body.innerHTML = `
      <div data-ss-filter-root>
        <select data-ss-filter="category"><option value="">All</option><option value="cut">Cut</option></select>
        <p data-ss-filter-count></p>
        <ul>
          <li data-ss-filter-item data-category="cut">Cut</li>
          <li data-ss-filter-item data-category="color">Color</li>
        </ul>
      </div>`;
    mountPublishedInteractions(document);
    expect(document.querySelector('[data-ss-filter-count]').textContent).toBe('Showing 2 of 2');
    const select = document.querySelector('select');
    select.value = 'cut';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const items = document.querySelectorAll('[data-ss-filter-item]');
    expect(items[0].hidden).toBe(false);
    expect(items[1].hidden).toBe(true);
    expect(document.querySelector('[data-ss-filter-count]').textContent).toBe('Showing 1 of 2');
  });

  it('opens the cart from the checkout button', () => {
    let opened = 0;
    document.body.innerHTML = `
      <button type="button" data-ss-open-cart>Review your order</button>
      <button type="button" data-testid="cart-toggle-button">Cart</button>`;
    document.querySelector('[data-testid="cart-toggle-button"]').addEventListener('click', () => {
      opened += 1;
    });
    mountPublishedInteractions(document);
    document.querySelector('[data-ss-open-cart]').click();
    expect(opened).toBe(1);
  });

  it('loads an https scheduler in place of the button', () => {
    document.body.innerHTML = `
      <section><h2>Book an Appointment</h2>
      <div class="ss-booking-embed">
        <button type="button" data-ss-booking-open data-embed-src="https://calendly.com/shop/cut">Show scheduler</button>
      </div></section>`;
    mountPublishedInteractions(document);
    document.querySelector('[data-ss-booking-open]').click();
    const frame = document.querySelector('iframe');
    expect(frame?.getAttribute('src')).toBe('https://calendly.com/shop/cut');
    expect(frame?.title).toBe('Book an Appointment');
    expect(document.querySelector('[data-ss-booking-open]')).toBeNull();
  });

  it('shows one inquiry step at a time', () => {
    document.body.innerHTML = `
      <form data-type="inquiry">
        <fieldset data-ss-step><input data-ss-required value="Ada" /></fieldset>
        <fieldset data-ss-step><input data-ss-required value="Soon" /></fieldset>
        <button type="submit" data-ss-step-submit>Submit inquiry</button>
      </form>`;
    mountPublishedInteractions(document);
    const steps = document.querySelectorAll('[data-ss-step]');
    expect(steps[0].hidden).toBe(false);
    expect(steps[1].hidden).toBe(true);
    expect(document.querySelector('[data-ss-step-submit]').hidden).toBe(true);
    document.querySelector('[data-ss-step-next]').click();
    expect(steps[1].hidden).toBe(false);
    expect(document.querySelector('[data-ss-step-submit]').hidden).toBe(false);
  });
});
