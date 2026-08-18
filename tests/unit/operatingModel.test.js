import { describe, it, expect } from 'vitest';
import {
  STAFF_ASSIGNMENT,
  resolveOperatingModel,
  getOperatingImplication,
  buildSiteNav,
  defaultNamedTeamMembers,
} from '../../src/config/operatingModel';

describe('operatingModel — solo vs non-solo', () => {
  it('treats solo as owner-operated with no staff picker', () => {
    const model = resolveOperatingModel('salon', 'solo');
    expect(model.staffAssignment).toBe(STAFF_ASSIGNMENT.OWNER);
    expect(model.businessMode).toBe('solo');
    expect(model.customerPicksStaff).toBe(false);
    expect(model.showTeamSection).toBe(false);
  });

  it('lets salon clients pick a stylist once there is a team', () => {
    const model = resolveOperatingModel('salon', 'studio');
    expect(model.staffAssignment).toBe(STAFF_ASSIGNMENT.PICK);
    expect(model.businessMode).toBe('team');
    expect(model.customerPicksStaff).toBe(true);
    expect(model.teamTitle).toBe('Meet Our Stylists');
    expect(model.noPreferenceText).toBe('Any Available Stylist');
  });

  it('dispatches a plumbing crew instead of letting customers pick', () => {
    const model = resolveOperatingModel('plumbing', 'studio');
    expect(model.staffAssignment).toBe(STAFF_ASSIGNMENT.DISPATCH);
    expect(model.businessMode).toBe('hybrid');
    expect(model.customerPicksStaff).toBe(false);
    expect(model.teamTitle).toBe('Our Plumbers');
    expect(model.noPreferenceText).toBe('Next Available');
  });

  it('shows restaurant staff as marketing, not a reservation picker', () => {
    const model = resolveOperatingModel('restaurant', 'established');
    expect(model.staffAssignment).toBe(STAFF_ASSIGNMENT.SHOWCASE);
    expect(model.businessMode).toBe('solo');
    expect(model.customerPicksStaff).toBe(false);
    expect(model.teamTitle).toBe('Meet the Kitchen');
  });

  it('lets a consulting studio offer a specific advisor', () => {
    const model = resolveOperatingModel('consultant', 'studio');
    expect(model.staffAssignment).toBe(STAFF_ASSIGNMENT.PICK);
    expect(model.businessMode).toBe('team');
  });
});

describe('operatingModel — default named team', () => {
  it('leaves solo sites without named people', () => {
    expect(defaultNamedTeamMembers('salon', 'solo')).toEqual([]);
  });

  it('names salon studio stylists customers can book', () => {
    const members = defaultNamedTeamMembers('salon', 'studio');
    expect(members.length).toBeGreaterThanOrEqual(2);
    expect(members[0].name).toBeTruthy();
    expect(members[0].title).toBeTruthy();
  });
});

describe('operatingModel — wizard copy', () => {
  it('explains dispatch vs picker in the implication line', () => {
    expect(getOperatingImplication('salon', 'studio')).toMatch(/pick/i);
    expect(getOperatingImplication('cleaning', 'studio')).toMatch(/dispatch/i);
    expect(getOperatingImplication('freelancer', 'solo')).toMatch(/you/i);
  });
});

describe('operatingModel — nav', () => {
  it('omits Team until named people exist', () => {
    const nav = buildSiteNav({
      _niche: 'salon',
      _level: 'studio',
      sections: [
        { type: 'services', enabled: true },
        { type: 'team', enabled: true, content: { members: [] } },
        { type: 'booking', enabled: true },
        { type: 'contact', enabled: true },
      ],
    });
    expect(nav.map((item) => item.href)).toEqual(['#services', '#booking', '#contact']);
  });

  it('links to the team section when people are named', () => {
    const nav = buildSiteNav({
      _niche: 'salon',
      _level: 'studio',
      _operatingModel: resolveOperatingModel('salon', 'studio'),
      sections: [
        { type: 'team', enabled: true, content: { members: [{ name: 'Ada' }, { name: 'Lin' }] } },
        { type: 'contact', enabled: true },
      ],
    });
    expect(nav).toContainEqual({ label: 'Stylists', href: '#team' });
  });

  it('uses Menu for restaurants and Shop for product catalogs', () => {
    const restaurant = buildSiteNav({
      _niche: 'restaurant',
      sections: [{ type: 'catalog', enabled: true }, { type: 'contact', enabled: true }],
    });
    expect(restaurant[0]).toEqual({ label: 'Menu', href: '#catalog' });

    const shop = buildSiteNav({
      _niche: 'product-showcase',
      sections: [{ type: 'catalog', enabled: true }],
    });
    expect(shop[0]).toEqual({ label: 'Shop', href: '#catalog' });
  });
});
