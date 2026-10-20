/**
 * The live page sets composed HTML with innerHTML, which does not run the
 * section <script> tags. This binds the same behaviors after paint.
 */

function bindOnce(el) {
  if (!el || el.dataset.ssBound === '1') return false;
  el.dataset.ssBound = '1';
  return true;
}

function mountBookingEmbeds(root) {
  root.querySelectorAll('.ss-booking-embed').forEach((embed) => {
    if (!bindOnce(embed)) return;
    embed.addEventListener('click', (event) => {
      const button = event.target.closest('[data-ss-booking-open]');
      if (!button || button.parentNode !== embed) return;
      const src = button.getAttribute('data-embed-src') || '';
      if (!src.startsWith('https://')) return;
      const frame = document.createElement('iframe');
      frame.src = src;
      const heading = embed.closest('section')?.querySelector('h2');
      frame.title = heading?.textContent?.trim() || 'Book';
      frame.loading = 'lazy';
      frame.style.cssText = 'width:100%;min-height:700px;border:0;display:block';
      button.replaceWith(frame);
    });
  });
}

function zipCovered(form, zip) {
  const areas = (form.getAttribute('data-areas') || '').split(',').filter(Boolean);
  const ranges = (form.getAttribute('data-ranges') || '').split(',').filter(Boolean).map((pair) => {
    const [start, end] = pair.split('-');
    return { start: Number(start), end: Number(end) };
  });
  const n = Number(zip);
  return areas.includes(zip) || ranges.some((range) => n >= range.start && n <= range.end);
}

function mountZipChecks(root) {
  root.querySelectorAll('form[data-type="zip-check"]').forEach((form) => {
    if (!bindOnce(form)) return;
    const result = form.querySelector('[data-ss-zip-result]');
    form.addEventListener('input', (event) => {
      if (!event.target || event.target.name !== 'zip' || !result) return;
      const zip = String(event.target.value || '').trim();
      if (!/^\d{5}$/.test(zip)) {
        result.textContent = '';
        return;
      }
      result.textContent = zipCovered(form, zip)
        ? (form.getAttribute('data-covered') || '')
        : (form.getAttribute('data-outside') || '');
    });
  });
}

function writeEstimatedTotal(form, selector, resultSelector) {
  const result = form.querySelector(resultSelector);
  if (!result) return;
  let total = 0;
  form.querySelectorAll(selector).forEach((input) => {
    total += Number(input.getAttribute('data-price')) || 0;
  });
  result.textContent = total ? `Estimated total $${total}` : '';
}

function mountPackageTotals(root) {
  root.querySelectorAll('form[data-type="package-quote"]').forEach((form) => {
    if (!bindOnce(form)) return;
    form.addEventListener('change', () => {
      writeEstimatedTotal(form, 'input[type="checkbox"][data-price]:checked', '[data-ss-package-total]');
    });
  });
}

function mountDiagnosticTotals(root) {
  root.querySelectorAll('form[data-type="diagnostic-quote"]').forEach((form) => {
    if (!bindOnce(form)) return;
    form.addEventListener('change', () => {
      writeEstimatedTotal(form, 'input[type="radio"][data-price]:checked', '[data-ss-diagnostic-total]');
    });
  });
}

function mountInquirySteps(root) {
  root.querySelectorAll('form[data-type="inquiry"]').forEach((form) => {
    const steps = form.querySelectorAll('[data-ss-step]');
    if (steps.length < 2 || !bindOnce(form)) return;
    let index = 0;
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.gap = '12px';
    bar.style.marginBottom = '16px';
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Back';
    back.setAttribute('data-ss-step-back', '');
    const next = document.createElement('button');
    next.type = 'button';
    next.textContent = 'Next';
    next.setAttribute('data-ss-step-next', '');
    bar.appendChild(back);
    bar.appendChild(next);
    const submit = form.querySelector('[data-ss-step-submit]');
    form.insertBefore(bar, submit);
    const show = (nextIndex) => {
      index = nextIndex;
      steps.forEach((step, i) => {
        const on = i === index;
        step.hidden = !on;
        step.querySelectorAll('[data-ss-required]').forEach((field) => {
          field.required = on;
        });
      });
      back.hidden = index === 0;
      next.hidden = index === steps.length - 1;
      if (submit) submit.hidden = index !== steps.length - 1;
    };
    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-ss-step-next]')) {
        event.preventDefault();
        if (form.reportValidity()) show(Math.min(index + 1, steps.length - 1));
      } else if (event.target.closest('[data-ss-step-back]')) {
        event.preventDefault();
        show(Math.max(index - 1, 0));
      }
    });
    show(0);
  });
}

function applyFilters(filterRoot) {
  const items = filterRoot.querySelectorAll('[data-ss-filter-item]');
  const count = filterRoot.querySelector('[data-ss-filter-count]');
  const controls = filterRoot.querySelectorAll('[data-ss-filter]');
  let shown = 0;
  items.forEach((item) => {
    let visible = true;
    controls.forEach((control) => {
      const value = control.value;
      if (!value) return;
      const attr = `data-${control.getAttribute('data-ss-filter')}`;
      const parts = (item.getAttribute(attr) || '').split('|');
      if (!parts.includes(value)) visible = false;
    });
    item.hidden = !visible;
    if (visible) shown += 1;
  });
  if (count) count.textContent = `Showing ${shown} of ${items.length}`;
}

function mountFilters(root) {
  root.querySelectorAll('[data-ss-filter-root]').forEach((filterRoot) => {
    if (!bindOnce(filterRoot)) return;
    filterRoot.addEventListener('change', () => applyFilters(filterRoot));
    applyFilters(filterRoot);
  });
}

function mountCheckoutOpens(root) {
  root.querySelectorAll('[data-ss-open-cart]').forEach((button) => {
    if (!bindOnce(button)) return;
    button.addEventListener('click', () => {
      const toggle = document.querySelector('[data-testid="cart-toggle-button"]');
      if (toggle) toggle.click();
    });
  });
}

/**
 * @param {ParentNode} [root]
 */
export function mountPublishedInteractions(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  mountBookingEmbeds(root);
  mountZipChecks(root);
  mountPackageTotals(root);
  mountDiagnosticTotals(root);
  mountInquirySteps(root);
  mountFilters(root);
  mountCheckoutOpens(root);
}
