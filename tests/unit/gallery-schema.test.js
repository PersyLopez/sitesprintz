/**
 * PUBLIC GALLERY DATABASE SCHEMA TESTS
 * 
 * TDD Phase: RED
 * Testing the database schema for public gallery feature
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool } from '../../database/db.js';

const db = { query: (...args) => pool.query(...args) };

describe('Public Gallery Database Schema', () => {
  let testUserId;
  let testSiteId;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      ['test@gallery.com', 'hash123']
    );
    testUserId = userResult.rows[0].id;

    // Create test site
    const siteResult = await db.query(
      `INSERT INTO sites (user_id, subdomain, name, template, status, plan)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [testUserId, 'testsite', 'Test Site', 'restaurant', 'published', 'pro']
    );
    testSiteId = siteResult.rows[0].id;
  });

  afterEach(async () => {
    // Cleanup
    await db.query('DELETE FROM sites WHERE user_id = $1', [testUserId]);
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  // ==================== SCHEMA TESTS ====================
  describe('is_public Column', () => {
    it('should have is_public column in sites table', async () => {
      const result = await db.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'sites' AND column_name = 'is_public'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].column_name).toBe('is_public');
      expect(result.rows[0].data_type).toBe('boolean');
    });

    it('should default is_public to false for new sites', async () => {
      const result = await db.query(
        'SELECT is_public FROM sites WHERE id = $1',
        [testSiteId]
      );

      expect(result.rows[0].is_public).toBe(false);
    });

    it('should allow setting is_public to true', async () => {
      await db.query(
        'UPDATE sites SET is_public = $1 WHERE id = $2',
        [true, testSiteId]
      );

      const result = await db.query(
        'SELECT is_public FROM sites WHERE id = $1',
        [testSiteId]
      );

      expect(result.rows[0].is_public).toBe(true);
    });

    it('should allow setting is_public to false', async () => {
      await db.query(
        'UPDATE sites SET is_public = $1 WHERE id = $2',
        [true, testSiteId]
      );

      await db.query(
        'UPDATE sites SET is_public = $1 WHERE id = $2',
        [false, testSiteId]
      );

      const result = await db.query(
        'SELECT is_public FROM sites WHERE id = $1',
        [testSiteId]
      );

      expect(result.rows[0].is_public).toBe(false);
    });

    it('should not allow null values for is_public', async () => {
      await expect(async () => {
        await db.query(
          'UPDATE sites SET is_public = $1 WHERE id = $2',
          [null, testSiteId]
        );
      }).rejects.toThrow();
    });
  });

  // ==================== QUERY TESTS ====================
  describe('Public Site Queries', () => {
    beforeEach(async () => {
      // Create multiple test sites with different is_public values
      await db.query(
        `INSERT INTO sites (user_id, subdomain, template_id, status, plan, is_public, site_data)
         VALUES 
         ($1, 'public-site-1', 'restaurant', 'published', 'pro', true, '{"hero": {"title": "Public Site 1"}}'::jsonb),
         ($1, 'public-site-2', 'salon', 'published', 'starter', true, '{"hero": {"title": "Public Site 2"}}'::jsonb),
         ($1, 'private-site', 'gym', 'published', 'pro', false, '{"hero": {"title": "Private Site"}}'::jsonb),
         ($1, 'draft-public', 'freelancer', 'draft', 'pro', true, '{"hero": {"title": "Draft Public"}}'::jsonb)`,
        [testUserId]
      );
    });

    it('should query only public sites', async () => {
      const result = await db.query(
        'SELECT * FROM sites WHERE is_public = true AND status = $1',
        ['published']
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
      result.rows.forEach(site => {
        expect(site.is_public).toBe(true);
        expect(site.status).toBe('published');
      });
    });

    it('should exclude private sites from public query', async () => {
      const result = await db.query(
        'SELECT * FROM sites WHERE is_public = true AND status = $1',
        ['published']
      );

      const privateSite = result.rows.find(site => site.subdomain === 'private-site');
      expect(privateSite).toBeUndefined();
    });

    it('should exclude draft sites even if marked public', async () => {
      const result = await db.query(
        'SELECT * FROM sites WHERE is_public = true AND status = $1',
        ['published']
      );

      const draftSite = result.rows.find(site => site.subdomain === 'draft-public');
      expect(draftSite).toBeUndefined();
    });

    it('should filter public sites by template category', async () => {
      const result = await db.query(
        'SELECT * FROM sites WHERE is_public = true AND status = $1 AND template_id = $2',
        ['published', 'restaurant']
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      result.rows.forEach(site => {
        expect(site.template_id).toBe('restaurant');
      });
    });

    it('should search public sites by name', async () => {
      const result = await db.query(
        `SELECT * FROM sites 
         WHERE is_public = true 
         AND status = $1 
         AND site_data::text ILIKE $2`,
        ['published', '%Public Site%']
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });

    it('should order public sites by created_at DESC', async () => {
      const result = await db.query(
        `SELECT * FROM sites 
         WHERE is_public = true 
         AND status = $1 
         ORDER BY created_at DESC`,
        ['published']
      );

      if (result.rows.length > 1) {
        const dates = result.rows.map(site => new Date(site.created_at));
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
        }
      }
    });

    it('should support pagination with LIMIT and OFFSET', async () => {
      const page1 = await db.query(
        `SELECT * FROM sites 
         WHERE is_public = true 
         AND status = $1 
         ORDER BY created_at DESC
         LIMIT 1 OFFSET 0`,
        ['published']
      );

      const page2 = await db.query(
        `SELECT * FROM sites 
         WHERE is_public = true 
         AND status = $1 
         ORDER BY created_at DESC
         LIMIT 1 OFFSET 1`,
        ['published']
      );

      expect(page1.rows[0].id).not.toBe(page2.rows[0]?.id);
    });
  });

  // ==================== INDEX TESTS ====================
  describe('Database Indexes', () => {
    it('should have index on is_public column for performance', async () => {
      const result = await db.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'sites'
        AND indexdef LIKE '%is_public%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should have composite index on (is_public, status) for common queries', async () => {
      const result = await db.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'sites'
        AND indexdef LIKE '%is_public%'
        AND indexdef LIKE '%status%'
      `);

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });
});

