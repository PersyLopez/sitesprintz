/**
 * Marketing head (index.html) — crawlability guard.
 * The head is static HTML; reading the file proves the tags stay
 * absolute against https://rightsitelight.com.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const html = readFileSync(join(__dirname, '../../index.html'), 'utf8');

const attr = (tag, name) => {
  const match = html.match(new RegExp(`<${tag}[^>]*\\b${name}="([^"]*)"`));
  return match ? match[1] : null;
};

describe('marketing index head crawlability', () => {
  it('has a canonical link pointing at the site root', () => {
    expect(attr('link rel="canonical"', 'href')).toBe('https://rightsitelight.com/');
  });

  it('has an absolute og:url at the site root', () => {
    expect(attr('meta property="og:url"', 'content')).toBe('https://rightsitelight.com/');
  });

  it('declares Right Site Light as og:site_name', () => {
    expect(attr('meta property="og:site_name"', 'content')).toBe('Right Site Light');
  });

  it('uses absolute, non-root-relative image URLs for og:image and twitter:image', () => {
    for (const tag of ['meta property="og:image"', 'meta name="twitter:image"']) {
      const content = attr(tag, 'content');
      expect(content, tag).toMatch(/^https:\/\/rightsitelight\.com\//);
      expect(content, tag).not.toMatch(/^\/(?!\/)/);
    }
  });

  it('declares Organization and WebSite JSON-LD and no LocalBusiness', () => {
    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(ldMatch).not.toBeNull();
    const types = JSON.parse(ldMatch[1])['@graph'].map((node) => node['@type']);
    expect(types).toContain('Organization');
    expect(types).toContain('WebSite');
    expect(types).not.toContain('LocalBusiness');
  });
});
