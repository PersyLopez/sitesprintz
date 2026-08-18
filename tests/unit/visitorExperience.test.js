import { describe, it, expect } from 'vitest';
import {
  siteWantsEmbeddedBooking,
  applyVisitorExperienceDefaults,
  subdomainFromLivePath,
} from '../../src/utils/visitorExperience.js';
import { pickBookingServicesFromSiteData, pickBookingStaffFromSiteData } from '../../server/services/booking/ensurePublishedBooking.js';

describe('visitorExperience', () => {
  it('enables embedded booking from layout feature flags', () => {
    expect(siteWantsEmbeddedBooking({
      _features: { booking: { offered: true, enabled: true } },
    })).toBe(true);
  });

  it('keeps Starter link-only booking from using the native widget', () => {
    expect(siteWantsEmbeddedBooking({
      booking: { enabled: true, mode: 'link', embedded: false },
      _features: { booking: { enabled: true } },
    })).toBe(false);
  });

  it('stamps booking flags onto salon wizard data', () => {
    const next = applyVisitorExperienceDefaults({
      _features: { booking: { enabled: true } },
      settings: {},
    });
    expect(next.booking.enabled).toBe(true);
    expect(next.booking.embedded).toBe(true);
    expect(next.settings.bookingEnabled).toBe(true);
    expect(next.settings.payOnSite).toBe(true);
  });

  it('does not stamp booking for craftsman defaults', () => {
    const next = applyVisitorExperienceDefaults({
      _features: { booking: { offered: true, enabled: false } },
      settings: {},
    });
    expect(next.booking).toBeUndefined();
    expect(next.settings.bookingEnabled).toBeUndefined();
  });

  it('reads subdomain from live paths', () => {
    expect(subdomainFromLivePath('/sites/maple-salon')).toBe('maple-salon');
    expect(subdomainFromLivePath('/view/gallery-salon/')).toBe('gallery-salon');
    expect(subdomainFromLivePath('/dashboard')).toBe('');
  });
});

describe('pickBookingServicesFromSiteData', () => {
  it('uses services section items for salon sites', () => {
    const picks = pickBookingServicesFromSiteData({
      _niche: 'salon',
      sections: [{
        type: 'services',
        content: { items: [{ name: 'Haircut', price: '$45', description: 'Cut' }] },
      }],
    });
    expect(picks[0]).toEqual(expect.objectContaining({ name: 'Haircut', price: 45 }));
  });

  it('uses reservation fallbacks for restaurants instead of menu items', () => {
    const picks = pickBookingServicesFromSiteData({
      _niche: 'restaurant',
      products: [{ name: 'Tacos', price: 12 }],
    });
    expect(picks[0].name).toMatch(/Table/i);
  });
});

describe('pickBookingStaffFromSiteData', () => {
  it('seeds named stylists for a salon studio', () => {
    const staff = pickBookingStaffFromSiteData({
      _niche: 'salon',
      _level: 'studio',
      _operatingModel: { businessMode: 'team', customerPicksStaff: true, noPreferenceText: 'Any Available Stylist' },
      team: [
        { name: 'Sarah Williams', title: 'Master Colorist' },
        { name: 'Alex Rodriguez', title: 'Lead Stylist' },
      ],
    });
    expect(staff.businessMode).toBe('team');
    expect(staff.staffSelectionEnabled).toBe(true);
    expect(staff.members).toHaveLength(2);
    expect(staff.members[0].name).toBe('Sarah Williams');
  });

  it('does not seed bookable staff for restaurant showcase teams', () => {
    const staff = pickBookingStaffFromSiteData({
      _niche: 'restaurant',
      _level: 'established',
      _operatingModel: { businessMode: 'solo', customerPicksStaff: false },
      team: [
        { name: 'James Chen', title: 'Executive Chef' },
        { name: 'Sophie Laurent', title: 'Pastry Chef' },
      ],
    });
    expect(staff.members).toEqual([]);
    expect(staff.staffSelectionEnabled).toBe(false);
  });

  it('reads team mode from booking config when layout metadata is missing', () => {
    const staff = pickBookingStaffFromSiteData({
      booking: { businessMode: 'team', noPreferenceText: 'Any Available Stylist' },
      sections: [{
        type: 'team',
        content: { members: [{ name: 'Ada' }, { name: 'Lin' }] },
      }],
    });
    expect(staff.businessMode).toBe('team');
    expect(staff.staffSelectionEnabled).toBe(true);
    expect(staff.members.map((member) => member.name)).toEqual(['Ada', 'Lin']);
  });
});
