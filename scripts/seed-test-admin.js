
import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function seedTestAdmin() {
    console.log('🌱 Seeding test admin user...');

    const email = 'admin@example.com';
    const password = 'admin123';

    try {
        // Check if user exists
        const existingUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUser.rows.length > 0) {
            console.log('User exists, updating password and role...');
            await query(
                'UPDATE users SET role = $1, status = $2, password_hash = $3 WHERE email = $4',
                ['admin', 'active', hashedPassword, email]
            );
        } else {
            console.log('Creating new admin user...');
            await query(
                `INSERT INTO users (email, password_hash, role, status, subscription_status, subscription_plan, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [email, hashedPassword, 'admin', 'active', 'active', 'free']
            );
        }

        console.log('✅ Test admin seeded successfully');

        // Seed regular test user
        console.log('🌱 Seeding regular test user...');
        const testEmail = 'test@example.com';
        const testPassword = 'password123';

        const existingTestUser = await query(
            'SELECT id FROM users WHERE email = $1',
            [testEmail]
        );

        const hashedTestPassword = await bcrypt.hash(testPassword, 10);

        if (existingTestUser.rows.length > 0) {
            console.log('Test user exists, updating password...');
            await query(
                'UPDATE users SET password_hash = $1, subscription_plan = $2 WHERE email = $3',
                [hashedTestPassword, 'pro', testEmail]
            );
        } else {
            console.log('Creating new test user...');
            await query(
                `INSERT INTO users (email, password_hash, role, status, subscription_status, subscription_plan, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [testEmail, hashedTestPassword, 'user', 'active', 'active', 'pro']
            );
        }
        console.log('✅ Regular test user seeded successfully');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
}

seedTestAdmin();
