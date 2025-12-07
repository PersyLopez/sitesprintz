/**
 * Global Setup for Playwright Tests
 * 
 * This runs once before all tests to:
 * - Seed the test database
 * - Set up test environment
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function globalSetup() {
    console.log('\n🔧 Running global test setup...\n');

    try {
        // Set test environment
        process.env.NODE_ENV = 'test';
        process.env.USE_MOCK_EMAIL = 'true';

        // Seed test database
        console.log('🌱 Seeding test database...');
        const { stdout, stderr } = await execAsync('node tests/setup/seed-test-data.js');

        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        console.log('✅ Global setup complete\n');
    } catch (error) {
        console.error('❌ Global setup failed:', error);
        throw error;
    }
}
