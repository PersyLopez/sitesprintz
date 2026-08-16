import { describe, it, expect } from 'vitest';
import {
  getTeamMemberList,
  countTeamSlots,
  getNamedTeamMembers,
  isSoloVoice,
  shouldRenderTeam,
  resolveTeamHeading,
  resolveVoiceCopy,
} from '../../src/utils/businessScale';

describe('businessScale — team list shapes', () => {
  it('reads a plain team array', () => {
    expect(getTeamMemberList({ team: [{ name: 'Ada' }] })).toEqual([{ name: 'Ada' }]);
  });

  it('reads catalog { members } shape', () => {
    expect(getTeamMemberList({ team: { members: [{ name: 'Ada' }, { name: 'Lin' }] } })).toHaveLength(2);
  });

  it('reads a team section when top-level team is empty', () => {
    const siteData = {
      team: { members: [] },
      sections: [{ type: 'team', content: { members: [{ name: 'Ada' }] } }],
    };
    expect(getTeamMemberList(siteData)).toEqual([{ name: 'Ada' }]);
  });

  it('reads staff as a fallback', () => {
    expect(getTeamMemberList({ staff: [{ name: 'Ada' }] })).toHaveLength(1);
  });
});

describe('businessScale — countTeamSlots', () => {
  it('prefers teamSize hints used by the wizard', () => {
    expect(countTeamSlots({ teamSize: 4, team: [] })).toBe(4);
  });

  it('counts { members } slots including unnamed placeholders', () => {
    expect(countTeamSlots({ team: { members: [{}, {}] } })).toBe(2);
  });

  it('returns 0 for empty data', () => {
    expect(countTeamSlots(null)).toBe(0);
    expect(countTeamSlots({})).toBe(0);
  });
});

describe('businessScale — named members and publish gating', () => {
  it('ignores unnamed placeholders on publish', () => {
    expect(getNamedTeamMembers({ team: [{}, { name: 'Ada' }] })).toEqual([{ name: 'Ada' }]);
    expect(shouldRenderTeam([{}, { name: '  ' }])).toBe(false);
    expect(shouldRenderTeam([{ name: 'Ada' }])).toBe(true);
  });

  it('uses About for 0–1 people and Our Team for 2+', () => {
    expect(resolveTeamHeading([])).toBe('About');
    expect(resolveTeamHeading([{ name: 'Ada' }])).toBe('About');
    expect(resolveTeamHeading([{ name: 'Ada' }, { name: 'Lin' }])).toBe('Our Team');
  });

  it('preserves a custom heading like Meet Our Stylists', () => {
    expect(resolveTeamHeading([{ name: 'Ada' }], 'Meet Our Stylists')).toBe('Meet Our Stylists');
  });
});

describe('businessScale — voice', () => {
  it('treats explicit solo level as solo even with many services', () => {
    expect(isSoloVoice({ team: [], services: [{}, {}, {}, {}] }, 'solo')).toBe(true);
  });

  it('treats a single listed person as solo voice', () => {
    expect(isSoloVoice({ team: [{ name: 'Ada' }] }, 'studio')).toBe(true);
  });

  it('uses first-person titles for solo and plural for teams', () => {
    const solo = resolveVoiceCopy({ team: [] }, 'solo');
    expect(solo.servicesTitle).toBe('Services');
    expect(solo.processTitle).toBe('How I Work');
    expect(solo.aboutTitle).toBe('About');
    expect(solo.industriesTitle).toBe('Industries I Serve');

    const team = resolveVoiceCopy({ team: [{ name: 'A' }, { name: 'B' }] }, 'studio');
    expect(team.servicesTitle).toBe('Our Services');
    expect(team.processTitle).toBe('Our Process');
    expect(team.aboutTitle).toBe('About Us');
  });
});
