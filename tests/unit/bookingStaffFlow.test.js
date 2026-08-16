import { describe, it, expect } from 'vitest';
import {
  shouldShowStaffSelection,
  resolveAutoAssignedStaffId,
} from '../../src/utils/bookingStaffFlow';

const twoStaff = [{ id: 'a' }, { id: 'b' }];
const oneStaff = [{ id: 'a' }];

describe('bookingStaffFlow — shouldShowStaffSelection', () => {
  it('hides the picker for solo operators', () => {
    expect(shouldShowStaffSelection({
      isSoloOperation: true,
      showStaffSelection: true,
      staffForService: twoStaff,
    })).toBe(false);
  });

  it('hides the picker when effective mode is solo', () => {
    expect(shouldShowStaffSelection({
      effectiveMode: 'solo',
      showStaffSelection: true,
      staffForService: twoStaff,
    })).toBe(false);
  });

  it('hides the picker when only one person can do the service', () => {
    expect(shouldShowStaffSelection({
      effectiveMode: 'team',
      showStaffSelection: true,
      staffForService: oneStaff,
    })).toBe(false);
  });

  it('hides the picker when a team has no staff loaded yet', () => {
    expect(shouldShowStaffSelection({
      effectiveMode: 'team',
      showStaffSelection: true,
      staffForService: [],
    })).toBe(false);
  });

  it('hides the picker in hybrid auto-assign mode', () => {
    expect(shouldShowStaffSelection({
      effectiveMode: 'hybrid',
      showStaffSelection: false,
      staffForService: twoStaff,
    })).toBe(false);
  });

  it('shows the picker for a team with multiple qualified staff', () => {
    expect(shouldShowStaffSelection({
      effectiveMode: 'team',
      showStaffSelection: true,
      staffForService: twoStaff,
    })).toBe(true);
  });
});

describe('bookingStaffFlow — resolveAutoAssignedStaffId', () => {
  it('picks the only qualified person', () => {
    expect(resolveAutoAssignedStaffId({
      effectiveMode: 'team',
      staffForService: oneStaff,
    })).toBe('a');
  });

  it('uses no_preference for a team so load balancing can run', () => {
    expect(resolveAutoAssignedStaffId({
      effectiveMode: 'team',
      staffForService: twoStaff,
    })).toBe('no_preference');
  });

  it('uses the only staff member in solo mode', () => {
    expect(resolveAutoAssignedStaffId({
      isSoloOperation: true,
      allStaff: oneStaff,
    })).toBe('a');
  });

  it('returns null when nobody is on staff yet', () => {
    expect(resolveAutoAssignedStaffId({
      isSoloOperation: true,
      allStaff: [],
    })).toBeNull();
  });
});
