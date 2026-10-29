/**
 * Clover North America hosts. Europe and Latin America use different bases.
 * Hosted Checkout is US and Canada only.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function cloverHosts(env = process.env) {
  const production = env.CLOVER_ENV === 'production';
  return {
    authorize: production ? 'https://www.clover.com' : 'https://sandbox.dev.clover.com',
    api: production ? 'https://api.clover.com' : 'https://apisandbox.dev.clover.com',
    ecommerce: production ? 'https://scl.clover.com' : 'https://scl-sandbox.dev.clover.com',
  };
}

export function cloverConfigured(env = process.env) {
  return Boolean(env.CLOVER_APP_ID && env.CLOVER_APP_SECRET);
}
