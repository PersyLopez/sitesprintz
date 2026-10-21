import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { generateDemoContent } from '../../src/utils/demoContent.js';

// QA C-06: demo sites must not link social/booking accounts we do not own.
const FORBIDDEN_HOSTS = [
  'facebook.com/thegrandtable',
  'instagram.com/thegrandtable',
  'yelp.com/biz/thegrandtable',
  'calendly.com/thegrandtable',
];

const assertNoForbiddenLinks = (content) => {
  const serialized = JSON.stringify(content);
  for (const host of FORBIDDEN_HOSTS) {
    expect(serialized).not.toContain(host);
  }
};

describe('restaurant demo links (QA C-06)', () => {
  it('generateDemoContent has no The Grand Table social/booking links for any restaurant tier', () => {
    for (const templateId of ['restaurant-starter', 'restaurant-pro', 'restaurant-premium']) {
      assertNoForbiddenLinks(generateDemoContent(templateId));
    }
  });

  it('restaurant template JSON has empty social and calendly URL fields', () => {
    const templatePath = path.join(__dirname, '../../public/data/templates/restaurant.json');
    const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

    assertNoForbiddenLinks(template);
  });
});
