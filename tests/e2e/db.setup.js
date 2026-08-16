import { test as setup } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

setup('seed database', async () => {
    console.log('🌱 Seeding test database for E2E tests...');
    const { stdout, stderr } = await execAsync('node tests/setup/seed-test-data.js');

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('✅ Database seeded');
});
