/**
 * Production-safe secret loading.
 *
 * Every required secret must come from environment variables.
 * Fallback strings are NEVER allowed in production-capable paths.
 * In test environment, an explicit flag allows deterministic test-only fallbacks.
 */

export function getRequiredSecret(name, { allowTestFallback = false } = {}) {
  const value = process.env[name];

  if (value) return value;

  if (allowTestFallback && process.env.NODE_ENV === 'test') {
    return `test-only-${name.toLowerCase()}-secret`;
  }

  throw new Error(`${name} is required`);
}
