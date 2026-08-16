/**
 * Parse Site Data Helper
 * 
 * Safely parses site_data JSON with error handling.
 * Handles both string (JSON) and object formats.
 */

/**
 * Parse site data with fallback to empty object
 * @param {string|object} siteData - Raw site data (JSON string or object)
 * @returns {object} Parsed site data or empty object
 */
export function parseSiteData(siteData) {
  if (!siteData) {
    return {};
  }

  // Already an object
  if (typeof siteData === 'object') {
    return siteData;
  }

  // Try to parse JSON string
  if (typeof siteData === 'string') {
    try {
      return JSON.parse(siteData);
    } catch (error) {
      console.error('Failed to parse site_data JSON:', error.message);
      return {};
    }
  }

  // Unexpected type
  return {};
}

export default parseSiteData;




