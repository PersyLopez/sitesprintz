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

const STAFF_FULL_PERMISSIONS = {
  canViewOrders: true,
  canUpdateStatus: true,
  canManageAppointments: true,
};

const STAFF_LIMITED_PERMISSIONS = {
  canViewOrders: false,
  canUpdateStatus: false,
  canManageAppointments: true,
};

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

async function upsertStaffUser({ userId, staffId, tenantId, permissions }) {
  const existing = await prisma.staff_users.findFirst({
    where: { user_id: userId, tenant_id: tenantId },
  });

  const data = {
    user_id: userId,
    staff_id: staffId,
    tenant_id: tenantId,
    role: 'staff',
    permissions,
  };

  if (existing) {
    await prisma.staff_users.update({
      where: { id: existing.id },
      data,
    });
    return { id: existing.id, created: false };
  }

  const created = await prisma.staff_users.create({ data });
  return { id: created.id, created: true };
}

async function linkGallerySalonStaffUsers(userResults) {
  const site = await prisma.sites.findFirst({
    where: { subdomain: 'gallery-salon' },
    select: { id: true },
  });

  if (!site) {
    process.stderr.write('warn\tgallery-salon site not found; skipping staff_users seed\n');
    return null;
  }

  const tenant = await prisma.booking_tenants.findFirst({
    where: { site_id: site.id, status: 'active' },
    select: { id: true, business_name: true },
  });

  if (!tenant) {
    process.stderr.write('warn\tgallery-salon booking tenant not found; skipping staff_users seed\n');
    return null;
  }

  const staffRows = await prisma.booking_staff.findMany({
    where: { tenant_id: tenant.id, status: 'active' },
    orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
    select: { id: true, name: true },
  });

  if (staffRows.length === 0) {
    process.stderr.write('warn\tno active booking_staff for gallery-salon; skipping staff_users seed\n');
    return null;
  }

  const staffUser = userResults.find((row) => row.email === 'staff@example.com');
  const limitedUser = userResults.find((row) => row.email === 'staff-limited@example.com');
  const links = [];

  if (staffUser) {
    const link = await upsertStaffUser({
      userId: staffUser.id,
      staffId: staffRows[0].id,
      tenantId: tenant.id,
      permissions: STAFF_FULL_PERMISSIONS,
    });
    links.push({
      email: staffUser.email,
      staffId: staffRows[0].id,
      staffName: staffRows[0].name,
      tenantId: tenant.id,
      created: link.created,
    });
  }

  if (limitedUser && staffRows[1]) {
    const link = await upsertStaffUser({
      userId: limitedUser.id,
      staffId: staffRows[1].id,
      tenantId: tenant.id,
      permissions: STAFF_LIMITED_PERMISSIONS,
    });
    links.push({
      email: limitedUser.email,
      staffId: staffRows[1].id,
      staffName: staffRows[1].name,
      tenantId: tenant.id,
      created: link.created,
    });
  } else if (limitedUser) {
    process.stderr.write('warn\tsecond booking_staff missing; skipped staff-limited@ staff_users link\n');
  }

  return {
    siteId: site.id,
    tenantId: tenant.id,
    tenantName: tenant.business_name,
    staffIds: staffRows.map((row) => row.id),
    links,
  };
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

  const staffSeed = await linkGallerySalonStaffUsers(results);
  if (staffSeed) {
    process.stdout.write(
      `staff-linked\ttenant=${staffSeed.tenantId}\tstaff=${staffSeed.staffIds.join(',')}\n`
    );
    for (const link of staffSeed.links) {
      const action = link.created ? 'staff-created' : 'staff-updated';
      process.stdout.write(`${action}\t${link.email}\tstaff=${link.staffId}\n`);
    }
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
