/**
 * Token Cleanup Job
 * 
 * Periodically cleans up expired refresh tokens from the database.
 * Runs daily at 2 AM.
 */

import cron from 'node-cron';
import { cleanupExpiredTokens } from '../services/tokenService.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    const deleted = await cleanupExpiredTokens();
    console.log(`🧹 [Token Cleanup] Cleaned up ${deleted} expired refresh tokens`);
  } catch (error) {
    console.error('❌ [Token Cleanup] Error:', error);
  }
});

console.log('✅ [Token Cleanup] Job scheduled: Daily at 2 AM');










