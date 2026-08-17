/**
 * Allow only same-origin relative paths (e.g. /claim/abc).
 */
export function getSafeRedirect(value) {
  if (!value || typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//') || path.includes('\\')) return null;
  if (path.includes('://')) return null;
  return path;
}
