/**
 * Visual Editor Service
 * 
 * Handles visual editor logic with optimistic locking for race condition prevention
 * Implements TDD principles with comprehensive test coverage
 */

import fs from 'fs/promises';
import path from 'path';

export class VisualEditorService {
  constructor() {
    this.MAX_CHECKPOINTS = 50;
    this.HISTORY_LIMIT = 20;
  }
  
  /**
   * Load site data with version information
   */
  async loadSite(siteDir) {
    const siteJsonPath = path.join(siteDir, 'site.json');
    
    try {
      const data = await fs.readFile(siteJsonPath, 'utf-8');
      const siteData = JSON.parse(data);
      
      // Ensure version field exists
      if (!siteData.version) {
        siteData.version = 1;
        await this.saveSite(siteDir, siteData);
      }
      
      return siteData;
    } catch (error) {
      throw new Error(`Failed to load site: ${error.message}`);
    }
  }
  
  /**
   * Save site data atomically
   */
  async saveSite(siteDir, siteData) {
    const siteJsonPath = path.join(siteDir, 'site.json');
    const tempPath = `${siteJsonPath}.tmp`;
    
    try {
      // Write to temp file first
      await fs.writeFile(tempPath, JSON.stringify(siteData, null, 2), 'utf-8');
      
      // Atomic rename
      await fs.rename(tempPath, siteJsonPath);
    } catch (error) {
      // Cleanup temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {}
      
      throw new Error(`Failed to save site: ${error.message}`);
    }
  }
  
  /**
   * Apply changes to site data with version checking (optimistic locking)
   */
  async applyChangesWithVersionCheck(siteDir, changes, expectedVersion) {
    // Load current data
    const currentData = await this.loadSite(siteDir);
    
    // Check version - prevents race conditions!
    if (currentData.version !== expectedVersion) {
      return {
        success: false,
        conflict: true,
        currentVersion: currentData.version,
        expectedVersion,
        serverData: currentData
      };
    }
    
    // Validate all changes before applying any
    for (const change of changes) {
      this.validateFieldPath(change.field);
    }
    
    // Create checkpoint before making changes
    await this.createCheckpoint(siteDir, currentData);
    
    // Apply all changes
    for (const change of changes) {
      this.setFieldValue(currentData, change.field, change.value);
    }
    
    // Increment version
    currentData.version += 1;
    currentData.lastModified = new Date().toISOString();
    
    // Save atomically
    await this.saveSite(siteDir, currentData);
    
    // Cleanup old checkpoints
    await this.cleanupCheckpoints(siteDir);
    
    return {
      success: true,
      version: currentData.version,
      timestamp: currentData.lastModified
    };
  }
  
  /**
   * Set nested field value using dot notation
   */
  setFieldValue(obj, fieldPath, value) {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indices
      if (!isNaN(part)) {
        current = current[parseInt(part)];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (!isNaN(lastPart)) {
      current[parseInt(lastPart)] = value;
    } else {
      current[lastPart] = value;
    }
  }
  
  /**
   * Get nested field value using dot notation
   */
  getFieldValue(obj, fieldPath) {
    const parts = fieldPath.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      
      if (!isNaN(part)) {
        current = current[parseInt(part)];
      } else {
        current = current[part];
      }
    }
    
    return current;
  }
  
  /**
   * Validate field path format
   */
  validateFieldPath(fieldPath) {
    if (!fieldPath || typeof fieldPath !== 'string') {
      throw new Error('Invalid field path: must be a non-empty string');
    }
    
    // Check for invalid patterns
    if (fieldPath.includes('..')) {
      throw new Error('Invalid field path: cannot contain ".."');
    }
    
    if (fieldPath.startsWith('.') || fieldPath.endsWith('.')) {
      throw new Error('Invalid field path: cannot start or end with "."');
    }
    
    return true;
  }
  
  /**
   * Create checkpoint for version history
   */
  async createCheckpoint(siteDir, siteData, type = 'auto') {
    const checkpointsDir = path.join(siteDir, 'checkpoints');
    
    // Ensure checkpoints directory exists
    await fs.mkdir(checkpointsDir, { recursive: true });
    
    const checkpoint = {
      version: siteData.version,
      timestamp: Date.now(),
      type,
      data: siteData
    };
    
    const filename = `checkpoint-${checkpoint.timestamp}.json`;
    await fs.writeFile(
      path.join(checkpointsDir, filename),
      JSON.stringify(checkpoint, null, 2)
    );
    
    return checkpoint;
  }
  
  /**
   * Get version history (list of checkpoints)
   */
  async getVersionHistory(siteDir, limit = this.HISTORY_LIMIT) {
    const checkpointsDir = path.join(siteDir, 'checkpoints');
    
    try {
      const files = await fs.readdir(checkpointsDir);
      const checkpoints = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(checkpointsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const checkpoint = JSON.parse(content);
        
        checkpoints.push({
          id: file.replace('.json', ''),
          timestamp: checkpoint.timestamp,
          version: checkpoint.version,
          type: checkpoint.type || 'auto',
          description: this.generateCheckpointDescription(checkpoint)
        });
      }
      
      // Sort by timestamp descending (newest first)
      checkpoints.sort((a, b) => b.timestamp - a.timestamp);
      
      // Return limited results
      return checkpoints.slice(0, limit);
    } catch (error) {
      // Directory doesn't exist yet
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  /**
   * Generate human-readable checkpoint description
   */
  generateCheckpointDescription(checkpoint) {
    if (checkpoint.type === 'manual') {
      return 'Manual save point';
    }
    if (checkpoint.type === 'before-restore') {
      return 'Backup before restore';
    }
    
    // For auto checkpoints, we could track what changed
    // For now, return generic description
    return `Auto-saved changes (v${checkpoint.version})`;
  }
  
  /**
   * Restore site to a previous version
   */
  async restoreVersion(siteDir, checkpointId) {
    const checkpointsDir = path.join(siteDir, 'checkpoints');
    const checkpointPath = path.join(checkpointsDir, `${checkpointId}.json`);
    
    try {
      // Load checkpoint
      const content = await fs.readFile(checkpointPath, 'utf-8');
      const checkpoint = JSON.parse(content);
      
      // Create backup of current state before restoring
      const currentData = await this.loadSite(siteDir);
      await this.createCheckpoint(siteDir, currentData, 'before-restore');
      
      // Restore checkpoint data
      const restoredData = checkpoint.data;
      
      // Increment version (restore creates new version)
      restoredData.version = currentData.version + 1;
      restoredData.restoredFrom = checkpoint.version;
      restoredData.restoredAt = new Date().toISOString();
      
      // Save restored data
      await this.saveSite(siteDir, restoredData);
      
      return {
        success: true,
        restoredVersion: checkpoint.version,
        newVersion: restoredData.version
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Checkpoint not found');
      }
      throw error;
    }
  }
  
  /**
   * Cleanup old checkpoints (keep only last N)
   */
  async cleanupCheckpoints(siteDir) {
    const checkpointsDir = path.join(siteDir, 'checkpoints');
    
    try {
      const files = await fs.readdir(checkpointsDir);
      const checkpointFiles = files
        .filter(f => f.startsWith('checkpoint-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          timestamp: parseInt(f.replace('checkpoint-', '').replace('.json', ''))
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Newest first
      
      // Keep only MAX_CHECKPOINTS
      if (checkpointFiles.length > this.MAX_CHECKPOINTS) {
        const toDelete = checkpointFiles.slice(this.MAX_CHECKPOINTS);
        
        for (const file of toDelete) {
          await fs.unlink(path.join(checkpointsDir, file.name));
        }
      }
    } catch (error) {
      // Ignore cleanup errors
      console.error('Checkpoint cleanup error:', error);
    }
  }
  
  /**
   * Get current edit session info
   */
  async getEditSessionInfo(siteDir, userEmail) {
    const siteData = await this.loadSite(siteDir);
    
    return {
      subdomain: path.basename(siteDir),
      currentVersion: siteData.version,
      lastModified: siteData.lastModified,
      canEdit: siteData.owner_email === userEmail
    };
  }
  
  /**
   * Verify user has permission to edit site
   */
  async verifyEditPermission(siteDir, userEmail) {
    const siteData = await this.loadSite(siteDir);
    
    if (siteData.owner_email !== userEmail) {
      throw new Error('User does not have permission to edit this site');
    }
    
    return true;
  }
}

// Singleton instance
export const visualEditorService = new VisualEditorService();

