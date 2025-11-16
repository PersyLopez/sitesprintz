/**
 * SHOWCASE SITEMAP SERVICE
 * 
 * Generates sitemap entries for public showcase gallery pages
 * - Main showcase gallery page
 * - Individual site showcase pages
 * - Dynamic sitemap based on public sites
 */

import { galleryService } from './galleryService.js';

class ShowcaseSitemapService {
  /**
   * Generate sitemap entries for showcase pages
   * @param {string} baseUrl - Base URL of the site (e.g., https://sitesprintz.com)
   * @returns {Promise<Array<Object>>} Array of sitemap entries
   */
  async generateSitemapEntries(baseUrl = 'https://sitesprintz.com') {
    const entries = [];
    
    try {
      // Add main showcase gallery page
      entries.push({
        url: `${baseUrl}/showcase`,
        changefreq: 'daily',
        priority: 0.8,
        lastmod: new Date().toISOString().split('T')[0]
      });

      // Get all public sites
      const result = await galleryService.getPublicSites({
        page: 1,
        pageSize: 1000, // Get all public sites
        sortBy: 'created_at',
        sortOrder: 'desc'
      });

      // Add individual site showcase pages
      for (const site of result.sites) {
        entries.push({
          url: `${baseUrl}/showcase/${site.subdomain}`,
          changefreq: 'weekly',
          priority: 0.6,
          lastmod: site.updated_at ? new Date(site.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          images: this.extractImages(site)
        });
      }

      return entries;
    } catch (error) {
      console.error('Error generating showcase sitemap:', error);
      return entries; // Return partial entries if error occurs
    }
  }

  /**
   * Extract images from site data for image sitemap
   * @param {Object} site - Site object
   * @returns {Array<Object>} Array of image objects
   */
  extractImages(site) {
    const images = [];
    
    if (site.site_data?.images?.hero) {
      images.push({
        loc: site.site_data.images.hero,
        title: site.site_data?.hero?.title || 'Site Hero Image',
        caption: site.site_data?.hero?.subtitle || ''
      });
    }

    if (site.site_data?.images?.gallery && Array.isArray(site.site_data.images.gallery)) {
      site.site_data.images.gallery.forEach((imageUrl, index) => {
        images.push({
          loc: imageUrl,
          title: `${site.site_data?.hero?.title || 'Site'} Gallery Image ${index + 1}`
        });
      });
    }

    return images;
  }

  /**
   * Generate XML sitemap string
   * @param {Array<Object>} entries - Sitemap entries
   * @returns {string} XML sitemap
   */
  generateXML(entries) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

    for (const entry of entries) {
      xml += '  <url>\n';
      xml += `    <loc>${this.escapeXml(entry.url)}</loc>\n`;
      
      if (entry.lastmod) {
        xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
      }
      
      if (entry.changefreq) {
        xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
      }
      
      if (entry.priority) {
        xml += `    <priority>${entry.priority}</priority>\n`;
      }

      // Add image entries
      if (entry.images && entry.images.length > 0) {
        for (const image of entry.images) {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${this.escapeXml(image.loc)}</image:loc>\n`;
          if (image.title) {
            xml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`;
          }
          if (image.caption) {
            xml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`;
          }
          xml += '    </image:image>\n';
        }
      }

      xml += '  </url>\n';
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeXml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate Open Graph metadata for a site
   * @param {Object} site - Site object
   * @param {string} baseUrl - Base URL
   * @returns {Object} Open Graph meta tags
   */
  generateOpenGraphMeta(site, baseUrl = 'https://sitesprintz.com') {
    const title = site.site_data?.hero?.title || 'Showcase Site';
    const description = site.site_data?.about?.description || site.site_data?.hero?.subtitle || 'A beautiful website made with SiteSprintz';
    const image = site.site_data?.images?.hero || site.site_data?.hero?.backgroundImage || '/images/default-og.jpg';
    const url = `${baseUrl}/showcase/${site.subdomain}`;

    return {
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': url,
      'og:type': 'website',
      'og:site_name': 'SiteSprintz Showcase',
      
      // Twitter Card
      'twitter:card': 'summary_large_image',
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image
    };
  }

  /**
   * Generate structured data (Schema.org) for a site
   * @param {Object} site - Site object
   * @param {string} baseUrl - Base URL
   * @returns {Object} JSON-LD structured data
   */
  generateStructuredData(site, baseUrl = 'https://sitesprintz.com') {
    const title = site.site_data?.hero?.title || 'Showcase Site';
    const description = site.site_data?.about?.description || site.site_data?.hero?.subtitle || '';
    const image = site.site_data?.images?.hero || '';
    const url = `${baseUrl}/showcase/${site.subdomain}`;

    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': title,
      'description': description,
      'url': url,
      'image': image,
      'datePublished': site.created_at,
      'dateModified': site.updated_at || site.created_at,
      'inLanguage': 'en-US',
      'isPartOf': {
        '@type': 'WebSite',
        'name': 'SiteSprintz',
        'url': baseUrl
      }
    };
  }
}

export const showcaseSitemapService = new ShowcaseSitemapService();
export default ShowcaseSitemapService;

