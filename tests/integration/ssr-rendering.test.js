import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import publishedSiteRenderer from '../../server/services/publishedSiteRenderer.js';
import { sectionHtmlBuilder } from '../../server/rendering/sectionHtml.js';

describe('Published Site SSR Rendering', () => {
  describe('publishedSiteRenderer', () => {
    it('should render a complete HTML document with meta tags', async () => {
      const siteData = {
        businessName: 'Test Cleaning Co',
        businessDescription: 'Professional cleaning services',
        businessPhone: '555-1234',
        businessEmail: 'info@testcleaning.com',
        businessAddress: '123 Main St, City, ST 12345',
        category: 'cleaning'
      };

      const html = await publishedSiteRenderer.render(siteData, {
        baseUrl: 'localhost:3000',
        siteId: 'test-cleaning'
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Cleaning Co</title>');
      expect(html).toContain('meta name="description"');
      expect(html).toContain('Professional cleaning services');
    });

    it('should include Open Graph meta tags', async () => {
      const siteData = {
        businessName: 'My Business',
        businessDescription: 'Test business description',
        logo: 'https://example.com/logo.png'
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('property="og:title"');
      expect(html).toContain('property="og:description"');
      expect(html).toContain('property="og:image"');
      expect(html).toContain('https://example.com/logo.png');
    });

    it('should point og:image at the share card when siteIdentifier is passed', async () => {
      const html = await publishedSiteRenderer.render(
        {
          businessName: 'My Business',
          businessDescription: 'Test business description that is long enough'
        },
        { siteIdentifier: 'best-pizza' }
      );

      expect(html).toContain('/api/share/best-pizza/social');
      expect(html).toContain('property="og:image:width"');
      expect(html).toContain('property="og:image:height"');
    });

    it('should include Twitter Card meta tags', async () => {
      const siteData = {
        businessName: 'Test Business',
        businessDescription: 'Description'
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('property="twitter:card"');
      expect(html).toContain('property="twitter:title"');
      expect(html).toContain('property="twitter:description"');
    });

    it('should include canonical URL', async () => {
      const siteData = {
        businessName: 'Test'
      };

      const html = await publishedSiteRenderer.render(siteData, {
        siteId: 'test-site'
      });

      expect(html).toContain('rel="canonical"');
      expect(html).toContain('href=');
    });

    it('should include JSON-LD schema markup', async () => {
      const siteData = {
        businessName: 'Test Restaurant',
        businessDescription: 'Great food',
        category: 'restaurant'
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('application/ld+json');
      expect(html).toContain('@context');
      expect(html).toContain('@type');
    });

    it('should include composed live CSS inline', async () => {
      const siteData = {
        businessName: 'Test'
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('<style>');
      expect(html).toContain('--ss-bg');
      expect(html).toContain('.ss-live');
    });

    it('should render composed live markup instead of the legacy hydrate shell', async () => {
      const siteData = {
        businessName: 'Test'
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('class="ss-live"');
      expect(html).not.toContain('site-hydrate.js');
    });

    it('should escape HTML in meta tags to prevent XSS', async () => {
      const siteData = {
        businessName: '<script>alert("xss")</script>',
        businessDescription: '"><img src=x onerror="alert(1)"'
      };

      const html = await publishedSiteRenderer.render(siteData);

      // Verify dangerous content is escaped
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;img');
      expect(html).toContain('&quot;');
    });

  it('should include live theme tokens from the composed stylesheet', async () => {
      const siteData = {
        businessName: 'Themed Business',
        theme: {
          backgroundColor: '#ffffff',
          textColor: '#000000',
          primaryColor: '#ff0000',
          borderRadius: '8px'
        }
      };

      const html = await publishedSiteRenderer.render(siteData);

      expect(html).toContain('--ss-bg');
      expect(html).toContain('--ss-accent');
      expect(html).not.toContain('--color-bg: #ffffff');
    });
  });

  describe('sectionHtmlBuilder', () => {
    it('should build hero section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'hero',
            enabled: true,
            content: {
              title: 'Welcome to Our Site',
              subtitle: 'We are the best'
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="hero"');
      expect(html).toContain('Welcome to Our Site');
      expect(html).toContain('We are the best');
    });

    it('should build about section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'about',
            enabled: true,
            content: {
              title: 'About Us',
              description: 'We have great experience'
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="about"');
      expect(html).toContain('About Us');
      expect(html).toContain('We have great experience');
    });

    it('should build services section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'services',
            enabled: true,
            content: {
              title: 'Our Services',
              items: [
                { title: 'Service 1', description: 'Description 1', price: '$100' },
                { title: 'Service 2', description: 'Description 2', price: '$200' }
              ]
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="services"');
      expect(html).toContain('Our Services');
      expect(html).toContain('Service 1');
      expect(html).toContain('$100');
      expect(html).toContain('Service 2');
    });

    it('should build gallery section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'gallery',
            enabled: true,
            content: {
              title: 'Gallery',
              images: [
                { src: '/img1.jpg', alt: 'Image 1' },
                { src: '/img2.jpg', alt: 'Image 2' }
              ]
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="gallery"');
      expect(html).toContain('/img1.jpg');
      expect(html).toContain('/img2.jpg');
      expect(html).toContain('loading="lazy"');
    });

    it('should build testimonials section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'testimonials',
            enabled: true,
            content: {
              title: 'What Clients Say',
              testimonials: [
                { text: 'Great service!', author: 'John', rating: 5 },
                { text: 'Excellent!', author: 'Jane', rating: 5 }
              ]
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="testimonials"');
      expect(html).toContain('Great service!');
      expect(html).toContain('John');
      expect(html).toContain('★★★★★');
    });

    it('should build team section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'team',
            enabled: true,
            content: {
              title: 'Our Team',
              members: [
                { name: 'Alice', role: 'Manager', bio: 'Experienced manager' },
                { name: 'Bob', role: 'Developer', bio: 'Great developer' }
              ]
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="team"');
      expect(html).toContain('Alice');
      expect(html).toContain('Manager');
    });

    it('should build FAQ section HTML', async () => {
      const siteData = {
        sections: [
          {
            type: 'faq',
            enabled: true,
            content: {
              title: 'FAQ',
              items: [
                { question: 'What is this?', answer: 'It is a service' },
                { question: 'How much?', answer: 'Very affordable' }
              ]
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="faq"');
      expect(html).toContain('What is this?');
      expect(html).toContain('It is a service');
    });

    it('should skip disabled sections', async () => {
      const siteData = {
        sections: [
          {
            type: 'about',
            enabled: false,
            content: { description: 'Hidden about' }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).not.toContain('Hidden about');
    });

    it('should sort sections by order', async () => {
      const siteData = {
        sections: [
          { 
            type: 'services', 
            order: 2, 
            enabled: true, 
            content: { 
              title: 'Services', 
              items: [{ title: 'Item 1' }] 
            } 
          },
          { 
            type: 'about', 
            order: 1, 
            enabled: true, 
            content: { 
              title: 'About', 
              description: 'About us' 
            } 
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      const aboutPos = html.indexOf('About');
      const servicesPos = html.indexOf('Services');
      expect(aboutPos).toBeGreaterThan(-1);
      expect(servicesPos).toBeGreaterThan(-1);
      expect(aboutPos).toBeLessThan(servicesPos);
    });

    it('should escape HTML in section content to prevent XSS', async () => {
      const siteData = {
        sections: [
          {
            type: 'about',
            enabled: true,
            content: {
              title: '<img src=x onerror="alert(1)">',
              description: 'Safe content'
            }
          }
        ]
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      // Check that dangerous patterns are not present as raw HTML
      expect(html).not.toContain('<img src=x onerror=');
      expect(html).not.toContain('onerror="alert');
      // Check that they are escaped
      expect(html).toContain('&lt;img');
    });

    it('should return default hero if no sections', async () => {
      const siteData = {
        businessName: 'Default Business',
        businessDescription: 'Default description'
      };

      const html = await sectionHtmlBuilder.buildSectionsHtml(siteData);

      expect(html).toContain('class="hero"');
      expect(html).toContain('Default Business');
    });
  });
});
