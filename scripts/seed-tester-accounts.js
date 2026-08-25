#!/usr/bin/env node

/**
 * Upsert agent/tester logins so Turnstile can stay on for /register.
 * Agents and E2E must use /login with these accounts.
 *
 *   npm run seed:testers
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from '../database/db.js';
import { AGENT_TESTERS } from '../tests/fixtures/test-credentials.js';

dotenv.config();

async function upsertTester(account) {
  const passwordHash = await bcrypt.hash(account.password, 10);
  const now = new Date();
  const existing = await prisma.users.findUnique({
    where: { email: account.email },
  });

  const data = {
    password_hash: passwordHash,
    role: account.role,
    status: 'active',
    subscription_status: 'active',
    subscription_plan: account.plan,
    plan: account.plan,
    email_verified: true,
    last_login: now,
  };

  if (existing) {
    await prisma.users.update({
      where: { email: account.email },
      data,
    });
    return { email: account.email, id: existing.id, created: false };
  }

  const created = await prisma.users.create({
    data: {
      email: account.email,
      created_at: now,
      ...data,
    },
  });
  return { email: account.email, id: created.id, created: true };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const results = [];
  for (const account of AGENT_TESTERS) {
    results.push(await upsertTester(account));
  }

  for (const row of results) {
    const action = row.created ? 'created' : 'updated';
    process.stdout.write(`${action}\t${row.email}\n`);
  }
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
