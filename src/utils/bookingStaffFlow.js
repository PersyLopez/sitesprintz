/**
 * Customer booking flow: when to show a staff picker.
 *
 * Solo operators never see a picker. Teams do — unless only one person
 * can perform the selected service, or hybrid mode auto-assigns.
 */

/**
 * @param {Object} [opts]
 * @param {string} [opts.effectiveMode] - 'solo' | 'team' | 'hybrid'
 * @param {boolean} [opts.isSoloOperation]
 * @param {boolean} [opts.showStaffSelection]
 * @param {Array} [opts.staffForService]
 * @returns {boolean}
 */
export function shouldShowStaffSelection({
  effectiveMode,
  isSoloOperation,
  showStaffSelection,
  staffForService,
} = {}) {
  if (isSoloOperation) return false;
  if (effectiveMode === 'solo') return false;

  const count = Array.isArray(staffForService) ? staffForService.length : 0;
  if (count <= 1) return false;

  if (showStaffSelection === false) return false;
  if (effectiveMode === 'hybrid' && showStaffSelection !== true) return false;

  return true;
}

/**
 * Staff id to send when the picker is skipped.
 * @param {Object} [opts]
 * @param {boolean} [opts.isSoloOperation]
 * @param {string} [opts.effectiveMode]
 * @param {Array} [opts.staffForService]
 * @param {Array} [opts.allStaff]
 * @returns {string|null}
 */
export function resolveAutoAssignedStaffId({
  isSoloOperation,
  effectiveMode,
  staffForService,
  allStaff,
} = {}) {
  const pool = (Array.isArray(staffForService) && staffForService.length)
    ? staffForService
    : (Array.isArray(allStaff) ? allStaff : []);

  if (pool.length === 1) return pool[0].id || null;

  if (isSoloOperation || effectiveMode === 'solo') {
    return pool[0]?.id || null;
  }

  if (pool.length === 0) return null;
  return 'no_preference';
}
