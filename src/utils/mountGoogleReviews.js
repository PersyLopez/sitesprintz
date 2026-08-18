/**
 * Hydrate a reviews mount with Google Places reviews.
 * Fail closed: leave static quotes in place if the API is missing or errors.
 */

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderStars(rating) {
  const value = Number(rating) || 0;
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function renderReviewsMarkup(payload) {
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
  const rating = Number(payload.rating) || 0;
  const total = payload.user_ratings_total || reviews.length;
  const cards = reviews.slice(0, 5).map((review) => {
    const quote = review.text || review.quote || '';
    const author = review.author_name || review.author || '';
    return `<blockquote class="ss-google-review">
  <p>${escapeHtml(quote)}</p>
  ${author ? `<footer>— ${escapeHtml(author)} ${escapeHtml(renderStars(review.rating))}</footer>` : ''}
</blockquote>`;
  }).join('');

  const header = rating
    ? `<p class="ss-google-rating" data-testid="google-reviews-rating">${escapeHtml(String(rating.toFixed(1)))} · ${escapeHtml(String(total))} Google reviews</p>`
    : '';

  return `${header}${cards}`;
}

/**
 * @param {ParentNode} [root]
 * @returns {Promise<void>}
 */
export async function mountGoogleReviews(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.querySelector !== 'function') return;
  const el = root.querySelector('[data-testid="reviews-widget"]');
  if (!el) return;
  const placeId = el.getAttribute('data-place-id') || '';
  if (!placeId) return;

  try {
    const response = await fetch(`/api/reviews/${encodeURIComponent(placeId)}`, {
      credentials: 'include',
    });
    if (!response.ok) return;
    const payload = await response.json();
    const markup = renderReviewsMarkup(payload);
    if (!markup.trim()) return;
    const mount = el.querySelector('[data-google-reviews-live]') || el;
    mount.insertAdjacentHTML('afterbegin', markup);
  } catch {
    // Keep static testimonials if Places is unavailable.
  }
}
