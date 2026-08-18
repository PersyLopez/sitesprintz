/**
 * Pay-on-site (cash / in person).
 * Live checkout still requires settings.payOnSite === true so layout
 * cashPayment flags cannot silently enable unpaid orders.
 *
 * Created / demo sites should still give a complete visitor cart:
 * Growth publish stamps payOnSite on unless the owner turned cash off.
 * The remaining limited path is live card checkout (Stripe Connect).
 *
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function isPayOnSiteEnabled(siteData) {
  return siteData?.settings?.payOnSite === true;
}

/**
 * Stamp pay-on-site at publish/create time for Growth checkout.
 * Explicit false wins. Explicit true wins. Otherwise cash/pay-on-site
 * is the working order path until Stripe is connected.
 *
 * @param {object|null|undefined} siteData
 * @param {boolean} canCheckout
 * @returns {boolean}
 */
export function resolvePayOnSiteForPublish(siteData, canCheckout) {
  if (!canCheckout) return false;
  if (siteData?.settings?.payOnSite === false) return false;
  if (siteData?.settings?.payOnSite === true) return true;
  if (siteData?._features?.cashPayment?.enabled === false) return false;
  return true;
}
