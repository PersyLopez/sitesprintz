#!/usr/bin/env node

/**
 * Create Admin User Script
 * 
 * This script creates an admin user in the SiteSprintz database.
 * Use this for setting up your production admin account.
 * 
 * Usage:
 *   node scripts/create-admin.js
 *   
 * Or with custom email:
 *   node scripts/create-admin.js your-email@example.com
 */

import bcrypt from 'bcryptjs';
import { query } from '../database/db.js';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  console.log('\n🔐 SiteSprintz Admin User Setup\n');
  console.log('='.repeat(50));

  try {
    // Get email from command line or prompt
    let email = process.argv[2];

    if (!email) {
      email = await question('\n📧 Enter admin email: ');
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error('❌ Invalid email address');
      rl.close();
      process.exit(1);
    }

    email = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, email, role, status FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log('\n⚠️  User already exists:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Role:  ${user.role}`);
      console.log(`   Status: ${user.status}\n`);

      const update = await question('Do you want to update this user to admin? (yes/no): ');

      if (update.toLowerCase() !== 'yes' && update.toLowerCase() !== 'y') {
        console.log('❌ Cancelled');
        rl.close();
        process.exit(0);
      }

      // Prompt for new password
      const password = await question('Enter new password (or press Enter to keep existing): ');

      if (password.trim()) {
        // Update with new password
        const hashedPassword = await bcrypt.hash(password, 10);
        await query(
          'UPDATE users SET role = $1, status = $2, password_hash = $3, updated_at = NOW() WHERE email = $4',
          ['admin', 'active', hashedPassword, email]
        );
        console.log('\n✅ User updated to admin with new password!');
      } else {
        // Update without changing password
        await query(
          'UPDATE users SET role = $1, status = $2, updated_at = NOW() WHERE email = $3',
          ['admin', 'active', email]
        );
        console.log('\n✅ User updated to admin (password unchanged)!');
      }
    } else {
      // Create new admin user
      const password = await question('Enter password: ');

      if (!password || password.length < 8) {
        console.error('❌ Password must be at least 8 characters');
        rl.close();
        process.exit(1);
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await query(
        `INSERT INTO users (email, password_hash, role, status, subscription_status, subscription_plan, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, email, role, status`,
        [email, hashedPassword, 'admin', 'active', 'active', 'pro']
      );

      const newUser = result.rows[0];
      console.log('\n✅ Admin user created successfully!');
      console.log(`   ID:     ${newUser.id}`);
      console.log(`   Email:  ${newUser.email}`);
      console.log(`   Role:   ${newUser.role}`);
      console.log(`   Status: ${newUser.status}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Admin setup complete!');
    console.log('\n📝 Login credentials:');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: [the password you just entered]`);
    console.log('\n🔗 Login at:');
    console.log(`   Local:      http://localhost:5173/login`);
    console.log(`   Production: ${process.env.APP_URL || 'https://your-domain.com'}/login`);
    console.log('\n' + '='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the script
createAdmin();





