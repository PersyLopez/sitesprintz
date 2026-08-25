import {
  assertPublishableLocation,
  normalizeContactLocationFields,
} from '../../src/utils/liveSiteContact.js';
import { ensurePublicGeo } from '../services/serviceAreaGeoService.js';

export async function prepareOwnerSiteData(siteData, { siteId, forPublish = false } = {}) {
  const next = normalizeContactLocationFields(siteData);
  await ensurePublicGeo(next, { siteId });
  if (forPublish) {
    assertPublishableLocation(next);
  }
  return next;
}
