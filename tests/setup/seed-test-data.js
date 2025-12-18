#!/usr/bin/env node

/**
 * Seed Test Database
 * 
 * This script seeds the database with test data for E2E tests.
 * It creates test users, sites, bookings, and other necessary data.
 * 
 * Usage:
 *   node tests/setup/seed-test-data.js
 */

import bcrypt from 'bcryptjs';
import { prisma } from '../../database/db.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

async function seedTestData() {
    console.log('\n🌱 Seeding test database...\n');

    try {
        // 1. Create test users
        console.log('👤 Creating test users...');

        const testUsers = [
            {
                email: 'admin@example.com',
                password: 'admin123',
                role: 'admin',
                plan: 'pro'
            },
            {
                email: 'test@example.com',
                password: 'password123',
                role: 'user',
                plan: 'pro'
            },
            {
                email: 'free@example.com',
                password: 'password123',
                role: 'user',
                plan: 'free'
            }
        ];

        const userIds = {};

        for (const user of testUsers) {
            // Check if user exists
            const existing = await prisma.users.findUnique({
                where: { email: user.email }
            });

            if (existing) {
                userIds[user.email] = existing.id;
                console.log(`  ✓ User ${user.email} already exists (ID: ${userIds[user.email]})`);

                // Update to ensure correct role and plan
                await prisma.users.update({
                    where: { email: user.email },
                    data: {
                        role: user.role,
                        subscription_plan: user.plan,
                        subscription_status: 'active',
                        status: 'active'
                    }
                });
            } else {
                const hashedPassword = await bcrypt.hash(user.password, 10);
                const newUser = await prisma.users.create({
                    data: {
                        email: user.email,
                        password_hash: hashedPassword,
                        role: user.role,
                        status: 'active',
                        subscription_status: 'active',
                        subscription_plan: user.plan,
                        created_at: new Date()
                    }
                });
                userIds[user.email] = newUser.id;
                console.log(`  ✓ Created user ${user.email} (ID: ${userIds[user.email]})`);
            }
        }

        // 2. Create test sites
        console.log('\n🌐 Creating test sites...');

        const testSites = [
            {
                id: 'seed_test_restaurant',
                userId: userIds['test@example.com'],
                subdomain: 'test-restaurant',
                template: 'restaurant',
                status: 'published',
                siteData: {
                    businessName: 'Test Restaurant',
                    template: 'restaurant'
                }
            },
            {
                id: 'seed_test_salon',
                userId: userIds['test@example.com'],
                subdomain: 'test-salon',
                template: 'salon',
                status: 'draft',
                siteData: {
                    businessName: 'Test Salon',
                    template: 'salon'
                }
            },
            {
                id: 'seed_admin_site',
                userId: userIds['admin@example.com'],
                subdomain: 'admin-site',
                template: 'business',
                status: 'published',
                siteData: {
                    businessName: 'Admin Site',
                    template: 'business'
                }
            }
        ];

        const siteIds = [];
        const siteIdsBySubdomain = {};

        for (const site of testSites) {
            const existing = await prisma.sites.findFirst({
                where: {
                    user_id: site.userId,
                    subdomain: site.subdomain
                }
            });

            if (existing) {
                siteIds.push(existing.id);
                siteIdsBySubdomain[site.subdomain] = existing.id;
                console.log(`  ✓ Site "${site.subdomain}" already exists (ID: ${existing.id})`);

                // Keep seeded sites consistent across runs
                await prisma.sites.update({
                    where: { id: existing.id },
                    data: {
                        template_id: site.template,
                        status: site.status,
                        site_data: site.siteData,
                        site_data: site.siteData
                    }
                });
            } else {
                const siteId = site.id || `seed_site_${crypto.randomUUID()}`;
                const newSite = await prisma.sites.create({
                    data: {
                        id: siteId,
                        user_id: site.userId,
                        subdomain: site.subdomain,
                        template_id: site.template,
                        status: site.status,
                        site_data: site.siteData, // Prisma handles JSON serialization
                        created_at: new Date()
                    }
                });
                siteIds.push(newSite.id);
                siteIdsBySubdomain[site.subdomain] = newSite.id;
                console.log(`  ✓ Created site "${site.subdomain}" (ID: ${newSite.id})`);
            }
        }
        // 3. Create booking tenant for test user
        console.log('\n📅 Creating booking data...');

        const proUserId = userIds['test@example.com'];

        // Check if booking_tenants table exists
        // Using raw query for schema check
        const tableCheck = await prisma.$queryRaw`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'booking_tenants'
            )
        `;

        // Prisma returns BigInt for count/exists sometimes, or array of objects
        // tableCheck is likely [{ exists: true }]
        const exists = tableCheck[0]?.exists || tableCheck[0]?.EXISTS;

        if (exists) {
            console.log('  ✓ Booking tables exist');
        } else {
            console.log('  ⚠️  Booking tables not found, creating them...');
            try {
                const schemaPath = path.resolve(process.cwd(), 'database/booking-schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                // Prisma does NOT reliably support multi-statement execution in one call.
                // Execute statements one-by-one for determinism.
                const statements = schemaSql
                    .split(';')
                    .map(s => s.trim())
                    .filter(Boolean);

                for (const stmt of statements) {
                    await prisma.$executeRawUnsafe(stmt);
                }
                console.log('  ✓ Created booking tables from schema');
            } catch (err) {
                console.error('  ❌ Failed to create booking tables:', err);
            }
        }

        // Re-check if tables exist (or assume they do if we just created them)
        // We'll proceed with seeding logic

        if (true) { // Proceed with seeding logic
            // Create booking tenant
            const tenantCheck = await prisma.booking_tenants.findFirst({
                where: { user_id: proUserId }
            });

            let tenantId;
            if (tenantCheck) {
                tenantId = tenantCheck.id;
                console.log(`  ✓ Booking tenant already exists for test user`);
            } else {
                const newTenant = await prisma.booking_tenants.create({
                    data: {
                        user_id: proUserId,
                        business_name: 'Test Business',
                        created_at: new Date()
                    }
                });
                tenantId = newTenant.id;
                console.log(`  ✓ Created booking tenant (ID: ${tenantId})`);
            }

            // Create booking services
            const services = [
                { name: 'Haircut', duration: 30 },
                { name: 'Massage', duration: 60 },
                { name: 'Consultation', duration: 15 }
            ];

            for (const service of services) {
                try {
                    const serviceCheck = await prisma.booking_services.findFirst({
                        where: {
                            tenant_id: tenantId,
                            name: service.name
                        }
                    });

                    if (!serviceCheck) {
                        await prisma.booking_services.create({
                            data: {
                                tenant_id: tenantId,
                                name: service.name,
                                duration_minutes: service.duration,
                                status: 'active',
                                created_at: new Date()
                            }
                        });
                        console.log(`  ✓ Created service "${service.name}"`);
                    } else {
                        console.log(`  ✓ Service "${service.name}" already exists`);
                    }
                } catch (error) {
                    console.log(`  ⚠️  Could not create service "${service.name}": ${error.message}`);
                }
            }

            // Create staff member
            const staffCheck = await prisma.booking_staff.findFirst({
                where: { tenant_id: tenantId }
            });

            if (!staffCheck) {
                await prisma.booking_staff.create({
                    data: {
                        tenant_id: tenantId,
                        name: 'Test Staff',
                        email: 'staff@example.com',
                        title: 'Service Provider',
                        is_primary: true,
                        status: 'active',
                        created_at: new Date()
                    }
                });
                console.log(`  ✓ Created staff member`);
            } else {
                console.log(`  ✓ Staff member already exists`);
            }

            // Ensure availability rules exist
            const staff = await prisma.booking_staff.findFirst({
                where: { tenant_id: tenantId }
            });

            if (staff) {
                // Always recreate rules to ensure correct schedule
                await prisma.booking_availability_rules.deleteMany({
                    where: { staff_id: staff.id }
                });

                console.log('  Creating default availability rules (Sun-Sat)...');
                const weekDays = [0, 1, 2, 3, 4, 5, 6]; // All days (Sun-Sat)
                const availabilityData = weekDays.map(day => ({
                    tenant_id: tenantId,
                    staff_id: staff.id,
                    day_of_week: day,
                    start_time: new Date('1970-01-01T09:00:00Z'),
                    end_time: new Date('1970-01-01T17:00:00Z'),
                    is_available: true
                }));

                await prisma.booking_availability_rules.createMany({
                    data: availabilityData
                });
                console.log(`  ✓ Created default availability (Sun-Sat 9-5)`);
            }

            // Check specifically for CONFIRMED appointments
            const confirmedCount = await prisma.appointments.count({
                where: {
                    tenant_id: tenantId,
                    status: 'confirmed'
                }
            });

            if (confirmedCount === 0) {
                const service = await prisma.booking_services.findFirst({
                    where: { tenant_id: tenantId }
                });

                if (service) {
                    const serviceId = service.id;
                    const serviceDuration = 30; // Default or fetch from service

                    // Create a few appointments
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(10, 0, 0, 0);

                    const endTime = new Date(tomorrow);
                    endTime.setMinutes(endTime.getMinutes() + serviceDuration);

                    const confirmationCode = Math.random().toString(36).substring(2, 10).toUpperCase();

                    const staff = await prisma.booking_staff.findFirst({
                        where: { tenant_id: tenantId }
                    });

                    if (staff) {
                        await prisma.appointments.create({
                            data: {
                                tenant_id: tenantId,
                                service_id: serviceId,
                                staff_id: staff.id,
                                customer_name: 'John Doe',
                                customer_email: 'john@example.com',
                                customer_phone: '555-0100',
                                start_time: tomorrow,
                                end_time: endTime,
                                duration_minutes: serviceDuration,
                                confirmation_code: confirmationCode,
                                status: 'confirmed',
                                timezone: 'UTC',
                                created_at: new Date()
                            }
                        });
                        console.log(`  ✓ Created sample appointments`);
                    }
                }
            } else {
                console.log(`  ✓ Appointments already exist`);
            }
        }

        // 4. Ensure sites table has is_public column and seed showcase data
        console.log('\n🎨 Configuring showcase data...');

        // Add is_public column if not exists
        // Using executeRawUnsafe for DDL
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sites' AND column_name = 'is_public') THEN 
                    ALTER TABLE sites ADD COLUMN is_public BOOLEAN DEFAULT false; 
                END IF; 
            END $$;
        `);

        // Make some sites public
        for (const siteId of siteIds.slice(0, 2)) {
            await prisma.sites.update({
                where: { id: siteId },
                data: { is_public: true }
            });
            console.log(`  ✓ Made site ${siteId} public for showcase`);
        }

        // 5. Write seed artifact for Playwright tests (avoid DB reads inside specs)
        try {
            const outDir = path.resolve(process.cwd(), 'tests/e2e/.seed');
            fs.mkdirSync(outDir, { recursive: true });
            const outPath = path.join(outDir, 'seed-data.json');

            const seedArtifact = {
                users: {
                    adminEmail: 'admin@example.com',
                    proEmail: 'test@example.com',
                    freeEmail: 'free@example.com',
                    adminUserId: userIds['admin@example.com'],
                    proUserId: userIds['test@example.com'],
                    freeUserId: userIds['free@example.com']
                },
                sites: {
                    bySubdomain: siteIdsBySubdomain
                }
            };

            // tenantId is defined only if booking seeding ran successfully
            if (typeof tenantId !== 'undefined' && tenantId) {
                seedArtifact.booking = { tenantId, userId: userIds['test@example.com'] };
            } else {
                seedArtifact.booking = { userId: userIds['test@example.com'] };
            }

            fs.writeFileSync(outPath, JSON.stringify(seedArtifact, null, 2), 'utf8');
            console.log(`\n📦 Wrote Playwright seed artifact: ${outPath}\n`);
        } catch (e) {
            console.warn('⚠️ Could not write Playwright seed artifact:', e?.message || e);
        }

        console.log('\n✅ Test database seeded successfully!\n');
        console.log('Test credentials:');
        console.log('  Admin:   admin@example.com / admin123');
        console.log('  User:    test@example.com / password123');
        console.log('  Free:    free@example.com / password123\n');

    } catch (error) {
        console.error('\n❌ Error seeding test data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

// Run the seeding
seedTestData();
