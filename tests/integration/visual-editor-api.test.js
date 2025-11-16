/**
 * Integration Tests for Visual Editor API Endpoints
 * 
 * Tests the backend API that supports visual editor functionality
 * including optimistic locking and conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

// We'll test against the actual server endpoints once implemented
describe('Visual Editor API - Site Updates with Optimistic Locking', () => {
  let app;
  let testSiteDir;
  let token;
  
  beforeEach(async () => {
    // Setup test server
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      if (req.headers.authorization === 'Bearer test-token') {
        req.user = { email: 'test@example.com', id: 1 };
      }
      next();
    });
    
    // Test site directory
    testSiteDir = path.join(process.cwd(), 'public', 'sites', 'test-site');
    
    // Create test site with initial data
    await fs.mkdir(testSiteDir, { recursive: true });
    await fs.writeFile(
      path.join(testSiteDir, 'site.json'),
      JSON.stringify({
        version: 1,
        hero: {
          title: 'Original Title',
          subtitle: 'Original Subtitle'
        },
        owner_email: 'test@example.com'
      })
    );
    
    token = 'test-token';
  });
  
  afterEach(async () => {
    // Cleanup
    try {
      await fs.rm(testSiteDir, { recursive: true, force: true });
    } catch (err) {
      // Ignore cleanup errors
    }
  });
  
  describe('PATCH /api/sites/:subdomain - Update with version control', () => {
    it('should accept changes with correct version number', async () => {
      // Import the actual route handler (to be implemented)
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [
            { field: 'hero.title', value: 'New Title' }
          ]
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.version).toBe(2);
    });
    
    it('should reject changes with wrong version number', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 5, // Wrong version!
          changes: [
            { field: 'hero.title', value: 'New Title' }
          ]
        });
      
      expect(response.status).toBe(409); // Conflict
      expect(response.body.error).toContain('version');
      expect(response.body.currentVersion).toBe(1);
    });
    
    it('should return server data on version conflict', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 0,
          changes: [{ field: 'hero.title', value: 'My Title' }]
        });
      
      expect(response.status).toBe(409);
      expect(response.body.serverData).toBeDefined();
      expect(response.body.serverData.hero.title).toBe('Original Title');
    });
    
    it('should increment version number on successful update', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      // First update
      let response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [{ field: 'hero.title', value: 'Update 1' }]
        });
      
      expect(response.body.version).toBe(2);
      
      // Second update
      response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 2,
          changes: [{ field: 'hero.subtitle', value: 'Update 2' }]
        });
      
      expect(response.body.version).toBe(3);
    });
    
    it('should create checkpoint on each update', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [{ field: 'hero.title', value: 'New Title' }]
        });
      
      // Check that checkpoint was created
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      const checkpoints = await fs.readdir(checkpointsDir);
      
      expect(checkpoints.length).toBeGreaterThan(0);
    });
    
    it('should only keep last 50 checkpoints', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      // Make 60 updates
      for (let i = 1; i <= 60; i++) {
        await request(app)
          .patch('/api/sites/test-site')
          .set('Authorization', `Bearer ${token}`)
          .send({
            version: i,
            changes: [{ field: 'hero.title', value: `Title ${i}` }]
          });
      }
      
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      const checkpoints = await fs.readdir(checkpointsDir);
      
      expect(checkpoints.length).toBeLessThanOrEqual(50);
    });
    
    it('should verify ownership before allowing updates', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      // Different user token
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', 'Bearer wrong-token')
        .send({
          version: 1,
          changes: [{ field: 'hero.title', value: 'Hacked' }]
        });
      
      expect(response.status).toBe(403);
    });
    
    it('should handle multiple field updates in one request', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [
            { field: 'hero.title', value: 'New Title' },
            { field: 'hero.subtitle', value: 'New Subtitle' },
            { field: 'hero.image', value: 'new-image.jpg' }
          ]
        });
      
      expect(response.status).toBe(200);
      
      // Verify all changes were applied
      const siteData = JSON.parse(
        await fs.readFile(path.join(testSiteDir, 'site.json'), 'utf-8')
      );
      
      expect(siteData.hero.title).toBe('New Title');
      expect(siteData.hero.subtitle).toBe('New Subtitle');
      expect(siteData.hero.image).toBe('new-image.jpg');
    });
    
    it('should handle nested field paths correctly', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      // Update nested array item
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [
            { field: 'services.items.0.title', value: 'Updated Service' }
          ]
        });
      
      expect(response.status).toBe(200);
    });
    
    it('should atomically save all changes or none', async () => {
      const { patchSiteWithVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.patch('/api/sites/:subdomain', patchSiteWithVersion);
      
      const originalData = JSON.parse(
        await fs.readFile(path.join(testSiteDir, 'site.json'), 'utf-8')
      );
      
      // Send one valid and one invalid change
      const response = await request(app)
        .patch('/api/sites/test-site')
        .set('Authorization', `Bearer ${token}`)
        .send({
          version: 1,
          changes: [
            { field: 'hero.title', value: 'New Title' },
            { field: 'invalid..path', value: 'Bad' } // Invalid field
          ]
        });
      
      expect(response.status).toBe(400);
      
      // Verify NO changes were applied
      const currentData = JSON.parse(
        await fs.readFile(path.join(testSiteDir, 'site.json'), 'utf-8')
      );
      
      expect(currentData).toEqual(originalData);
    });
  });
  
  describe('GET /api/sites/:subdomain/history - Version History', () => {
    it('should return list of checkpoints', async () => {
      const { getVersionHistory } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/history', getVersionHistory);
      
      // Create some checkpoints first
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      await fs.mkdir(checkpointsDir, { recursive: true });
      
      await fs.writeFile(
        path.join(checkpointsDir, 'checkpoint-1.json'),
        JSON.stringify({
          version: 1,
          timestamp: Date.now(),
          changes: [{ field: 'hero.title', value: 'Title 1' }]
        })
      );
      
      const response = await request(app)
        .get('/api/sites/test-site/history')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBeGreaterThan(0);
    });
    
    it('should return history sorted by timestamp descending', async () => {
      const { getVersionHistory } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/history', getVersionHistory);
      
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      await fs.mkdir(checkpointsDir, { recursive: true });
      
      // Create checkpoints with different timestamps
      const now = Date.now();
      await fs.writeFile(
        path.join(checkpointsDir, 'checkpoint-1.json'),
        JSON.stringify({ timestamp: now - 3000, version: 1 })
      );
      await fs.writeFile(
        path.join(checkpointsDir, 'checkpoint-2.json'),
        JSON.stringify({ timestamp: now - 1000, version: 2 })
      );
      
      const response = await request(app)
        .get('/api/sites/test-site/history')
        .set('Authorization', `Bearer ${token}`);
      
      const history = response.body.history;
      expect(history[0].timestamp).toBeGreaterThan(history[1].timestamp);
    });
    
    it('should return only last 20 checkpoints', async () => {
      const { getVersionHistory } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/history', getVersionHistory);
      
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      await fs.mkdir(checkpointsDir, { recursive: true });
      
      // Create 30 checkpoints
      for (let i = 1; i <= 30; i++) {
        await fs.writeFile(
          path.join(checkpointsDir, `checkpoint-${i}.json`),
          JSON.stringify({ timestamp: Date.now() + i, version: i })
        );
      }
      
      const response = await request(app)
        .get('/api/sites/test-site/history')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.history.length).toBeLessThanOrEqual(20);
    });
  });
  
  describe('POST /api/sites/:subdomain/restore/:versionId - Restore Version', () => {
    it('should restore site to previous version', async () => {
      const { restoreVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.post('/api/sites/:subdomain/restore/:versionId', restoreVersion);
      
      // Create a checkpoint to restore
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      await fs.mkdir(checkpointsDir, { recursive: true });
      
      const oldVersion = {
        version: 1,
        hero: { title: 'Old Title' },
        owner_email: 'test@example.com'
      };
      
      await fs.writeFile(
        path.join(checkpointsDir, 'checkpoint-1.json'),
        JSON.stringify(oldVersion)
      );
      
      // Update site to newer version
      await fs.writeFile(
        path.join(testSiteDir, 'site.json'),
        JSON.stringify({
          version: 2,
          hero: { title: 'New Title' },
          owner_email: 'test@example.com'
        })
      );
      
      const response = await request(app)
        .post('/api/sites/test-site/restore/checkpoint-1')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify site was restored
      const restoredData = JSON.parse(
        await fs.readFile(path.join(testSiteDir, 'site.json'), 'utf-8')
      );
      
      expect(restoredData.hero.title).toBe('Old Title');
    });
    
    it('should create backup before restoring', async () => {
      const { restoreVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.post('/api/sites/:subdomain/restore/:versionId', restoreVersion);
      
      const checkpointsDir = path.join(testSiteDir, 'checkpoints');
      await fs.mkdir(checkpointsDir, { recursive: true });
      
      await fs.writeFile(
        path.join(checkpointsDir, 'checkpoint-1.json'),
        JSON.stringify({ version: 1, hero: { title: 'Old' } })
      );
      
      await request(app)
        .post('/api/sites/test-site/restore/checkpoint-1')
        .set('Authorization', `Bearer ${token}`);
      
      // Check for before-restore backup
      const backups = await fs.readdir(checkpointsDir);
      const hasBackup = backups.some(f => f.includes('before-restore'));
      
      expect(hasBackup).toBe(true);
    });
    
    it('should return 404 for non-existent version', async () => {
      const { restoreVersion } = await import('../../server/routes/visual-editor.routes.js');
      app.post('/api/sites/:subdomain/restore/:versionId', restoreVersion);
      
      const response = await request(app)
        .post('/api/sites/test-site/restore/checkpoint-999')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
  
  describe('GET /api/sites/:subdomain/session - Edit Session Info', () => {
    it('should return current edit session details', async () => {
      const { getEditSession } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/session', getEditSession);
      
      const response = await request(app)
        .get('/api/sites/test-site/session')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.status).toBe(200);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.subdomain).toBe('test-site');
      expect(response.body.session.canEdit).toBe(true);
    });
    
    it('should return current version number', async () => {
      const { getEditSession } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/session', getEditSession);
      
      const response = await request(app)
        .get('/api/sites/test-site/session')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.body.session.currentVersion).toBe(1);
    });
    
    it('should return false for canEdit if not owner', async () => {
      const { getEditSession } = await import('../../server/routes/visual-editor.routes.js');
      app.get('/api/sites/:subdomain/session', getEditSession);
      
      // Mock different user
      app.use((req, res, next) => {
        req.user = { email: 'other@example.com', id: 2 };
        next();
      });
      
      const response = await request(app)
        .get('/api/sites/test-site/session')
        .set('Authorization', 'Bearer other-token');
      
      expect(response.body.session.canEdit).toBe(false);
    });
  });
});

describe('Visual Editor API - Error Handling', () => {
  it('should handle concurrent update attempts gracefully', async () => {
    // This test simulates two users editing at the same time
    // Both start with version 1, but only first should succeed
    
    // Implementation will be in the GREEN phase
  });
  
  it('should handle corrupted site.json files', async () => {
    // Test recovery from malformed JSON
  });
  
  it('should handle missing checkpoints directory', async () => {
    // Test auto-creation of required directories
  });
});

