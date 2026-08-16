/**
 * Admin Sections Configuration Service
 * Manages global section availability and tier overrides from the admin panel
 */

/**
 * Section override configuration
 * Stored in database and overrides registry defaults
 */
export class AdminSectionsService {
  /**
   * Get all section overrides
   * Fetches from /api/admin/sections
   * @returns {Promise<Array>} - Array of section override objects
   */
  static async getSectionOverrides() {
    try {
      const response = await fetch('/api/admin/sections', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching section overrides:', error);
      return [];
    }
  }

  /**
   * Update a section override
   * @param {string} sectionType - Section type ID
   * @param {Object} override - Override configuration
   * @returns {Promise<Object>} - Updated override
   */
  static async updateSectionOverride(sectionType, override) {
    try {
      const response = await fetch(`/api/admin/sections/${sectionType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(override)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error(`Error updating section override for ${sectionType}:`, error);
      throw error;
    }
  }

  /**
   * Disable a section globally
   * @param {string} sectionType - Section type
   * @returns {Promise<void>}
   */
  static async disableSection(sectionType) {
    return this.updateSectionOverride(sectionType, { enabled: false });
  }

  /**
   * Enable a section globally
   * @param {string} sectionType - Section type
   * @returns {Promise<void>}
   */
  static async enableSection(sectionType) {
    return this.updateSectionOverride(sectionType, { enabled: true });
  }

  /**
   * Override the required tier for a section
   * @param {string} sectionType - Section type
   * @param {string} tierOverride - New required tier
   * @returns {Promise<void>}
   */
  static async setTierOverride(sectionType, tierOverride) {
    return this.updateSectionOverride(sectionType, { tierOverride });
  }

  /**
   * Reset a section to registry defaults
   * @param {string} sectionType - Section type
   * @returns {Promise<void>}
   */
  static async resetSection(sectionType) {
    return this.updateSectionOverride(sectionType, { enabled: true, tierOverride: null });
  }
}

/**
 * Merge registry defaults with admin overrides
 * Used by renderer and builder to get effective section config
 * @param {Array} registrySections - Sections from registry
 * @param {Object} adminOverridesMap - Map of sectionType -> override config
 * @returns {Array} - Sections with overrides applied
 */
export function mergeWithAdminOverrides(registrySections, adminOverridesMap = {}) {
  return registrySections.map(section => {
    const override = adminOverridesMap[section.type];
    if (!override) return section;

    return {
      ...section,
      enabled: override.enabled !== false,
      requiredTier: override.tierOverride || section.requiredTier,
      _overridden: true
    };
  });
}

export default AdminSectionsService;
