/**
 * Pay-on-site (cash / in person) is an explicit owner opt-in.
 * Layout cashPayment defaults must not enable live unpaid checkout.
 *
 * @param {object|null|undefined} siteData
 * @returns {boolean}
 */
export function isPayOnSiteEnabled(siteData) {
  return siteData?.settings?.payOnSite === true;
}
