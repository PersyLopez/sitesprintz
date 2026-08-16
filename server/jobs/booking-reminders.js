/**
 * Booking Reminders Cron Job
 * 
 * Runs every 15 minutes to check and send appointment reminders
 * Usage: node server/jobs/booking-reminders.js
 */

import cron from 'node-cron';
import ReminderScheduler from '../services/booking/ReminderScheduler.js';
import { prisma } from '../../database/db.js';

const reminderScheduler = new ReminderScheduler();

/**
 * Start the reminder cron job
 */
export function startReminderJob() {
  console.log('[ReminderJob] Starting booking reminder job...');

  // Run every 15 minutes: 0, 15, 30, 45 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('[ReminderJob] Running reminder check...');
    try {
      const result = await reminderScheduler.processReminders();
      console.log('[ReminderJob] Reminder check completed:', result);
    } catch (error) {
      console.error('[ReminderJob] Error in reminder job:', error);
    }
  });

  console.log('[ReminderJob] Reminder job started (runs every 15 minutes)');
}

/**
 * Manual trigger for testing
 */
export async function triggerRemindersNow() {
  console.log('[ReminderJob] Manual trigger...');
  const result = await reminderScheduler.processReminders();
  console.log('[ReminderJob] Result:', result);
  return result;
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting reminder scheduler...');
  startReminderJob();

  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });
}


