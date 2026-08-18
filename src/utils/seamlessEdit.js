/**
 * Click-to-edit bindings for composed published-site HTML.
 */

const SKIP_SELECTOR = '[data-ss-booking-mount], .booking-widget, .shopping-cart, form';

function mark(el, path) {
  if (!el || el.closest(SKIP_SELECTOR)) return;
  el.setAttribute('data-editable', path);
}

export function annotateEditableMarkup(root) {
  if (!root) return;

  mark(root.querySelector('.ss-brand'), 'brand.name');

  root.querySelectorAll('section[data-ss-edit-type]').forEach((section) => {
    const type = section.getAttribute('data-ss-edit-type');
    if (!type) return;

    const title = section.querySelector('h1, .ss-h2, h2');
    mark(title, `${type}.title`);
    mark(section.querySelector('.ss-hero-sub'), `${type}.subtitle`);
    mark(section.querySelector('.ss-eyebrow'), `${type}.eyebrow`);
    mark(section.querySelector('.ss-lead'), `${type}.body`);

    const heroCta = type === 'hero' ? section.querySelector('.ss-btn') : null;
    mark(heroCta, `${type}.ctaText`);

    const cards = section.querySelectorAll('.ss-card, article.ss-card');
    cards.forEach((card, index) => {
      mark(card.querySelector('h3'), `${type}.items.${index}.name`);
      mark(card.querySelector('p'), `${type}.items.${index}.description`);
      mark(card.querySelector('.ss-price'), `${type}.items.${index}.price`);
    });

    if (type === 'team' && cards.length === 0) {
      const names = [...section.querySelectorAll('h3')];
      names.forEach((nameEl, index) => {
        mark(nameEl, `${type}.members.${index}.name`);
        const wrap = nameEl.parentElement;
        mark(wrap?.querySelector('div'), `${type}.members.${index}.role`);
        mark(wrap?.querySelector('p'), `${type}.members.${index}.bio`);
      });
    }
  });
}

export function textLuminance(color) {
  const parts = String(color || '').match(/\d+/g);
  if (!parts || parts.length < 3) return 1;
  const [r, g, b] = parts.slice(0, 3).map(Number);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function isTransparentColor(color) {
  const value = String(color || '').trim().toLowerCase();
  if (!value || value === 'transparent') return true;
  const parts = value.match(/[\d.]+/g);
  return Boolean(parts && parts.length >= 4 && Number(parts[3]) === 0);
}

export function resolveEditColor(computed) {
  const candidates = [
    computed?.color,
    computed?.webkitTextFillColor,
  ];
  const solid = candidates.find((color) => color && !isTransparentColor(color));
  if (solid) return solid;
  return textLuminance(computed?.backgroundColor) > 0.55 ? '#111318' : '#f4f2ee';
}

export function editingSurface(color) {
  const lightText = textLuminance(color) >= 0.55;
  return {
    color,
    background: lightText ? 'rgba(12, 12, 14, 0.88)' : 'rgba(255, 255, 255, 0.96)',
  };
}

export function applyEditingVisibility(element) {
  const computed = window.getComputedStyle(element);
  const surface = editingSurface(resolveEditColor(computed));
  element.style.setProperty('color', surface.color, 'important');
  element.style.setProperty('-webkit-text-fill-color', surface.color, 'important');
  element.style.setProperty('caret-color', surface.color, 'important');
  element.style.setProperty('mix-blend-mode', 'normal', 'important');
  element.style.setProperty('background-clip', 'border-box', 'important');
  element.style.setProperty('-webkit-background-clip', 'border-box', 'important');
  element.style.backgroundColor = surface.background;
  element.style.outline = '2px solid #3b82f6';
  element.style.outlineOffset = '2px';
  element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.18)';
  element.style.borderRadius = '6px';
  element.style.padding = computed.padding && computed.padding !== '0px' ? computed.padding : '6px 10px';
  element.style.minHeight = '1em';
  element.style.overflow = 'visible';
}

function clearEditingVisibility(element) {
  [
    'color',
    '-webkit-text-fill-color',
    'caret-color',
    'mix-blend-mode',
    'background-clip',
    '-webkit-background-clip',
    'background-color',
    'outline',
    'outline-offset',
    'box-shadow',
    'border-radius',
    'padding',
    'min-height',
    'overflow',
  ].forEach((prop) => element.style.removeProperty(prop));
}

function placeCaretAtEnd(element) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function enablePlaintextEditing(element) {
  element.setAttribute('contenteditable', 'plaintext-only');
  if (element.isContentEditable) return;
  element.setAttribute('contenteditable', 'true');
}

function finishEdit(element, originalValue, onCommit) {
  element.removeAttribute('contenteditable');
  element.classList.remove('is-editing');
  clearEditingVisibility(element);

  const next = element.textContent.trim();
  const prev = originalValue.trim();
  if (next === prev) return;

  const field = element.getAttribute('data-editable');
  if (field) onCommit({ field, previous: prev, value: next });
}

export function startEditableSession(element, onCommit) {
  if (!element || element.classList.contains('is-editing')) return () => {};

  const originalValue = element.textContent;
  element.classList.add('is-editing');
  applyEditingVisibility(element);
  enablePlaintextEditing(element);
  element.focus();
  placeCaretAtEnd(element);

  const onPaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  };

  const onKey = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      element.blur();
    }
    if (event.key === 'Escape') {
      element.textContent = originalValue;
      element.blur();
    }
  };

  const onBlur = () => {
    element.removeEventListener('paste', onPaste);
    element.removeEventListener('keydown', onKey);
    finishEdit(element, originalValue, onCommit);
  };

  element.addEventListener('paste', onPaste);
  element.addEventListener('keydown', onKey);
  element.addEventListener('blur', onBlur, { once: true });

  return () => {
    element.removeEventListener('paste', onPaste);
    element.removeEventListener('keydown', onKey);
    element.removeEventListener('blur', onBlur);
  };
}

/**
 * @param {ParentNode} root
 * @param {{ onCommit: Function }} handlers
 * @returns {() => void} unbind
 */
export function bindSeamlessEditing(root, { onCommit } = {}) {
  if (!root) return () => {};
  annotateEditableMarkup(root);

  const onClick = (event) => {
    const target = event.target.closest('[data-editable]');
    if (!target || !root.contains(target)) return;
    if (target.classList.contains('is-editing') || target.hasAttribute('contenteditable')) return;
    event.preventDefault();
    event.stopPropagation();
    startEditableSession(target, onCommit);
  };

  root.addEventListener('click', onClick, true);
  return () => root.removeEventListener('click', onClick, true);
}
