/**
 * Test Data Seeder for Booking System E2E Tests
 * Creates necessary test data for E2E test execution
 */

import { query } from '../database/db.js';
import BookingService from '../server/services/bookingService.js';
import dotenv from 'dotenv';

dotenv.config();

const bookingService = new BookingService();

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // 1. Create test user if not exists
    console.log('1️⃣ Creating/finding test user...');
    const userResult = await query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
       RETURNING id`,
      ['test-user@booking.com', '$2b$10$test', 'user']
    );
    const testUserId = userResult.rows[0].id;
    console.log(`✅ Test user created/found: ID ${testUserId}\n`);

    // 2. Create or get tenant for test user
    console.log('2️⃣ Creating booking tenant...');
    const tenant = await bookingService.getOrCreateTenant(testUserId, null, {
      business_name: 'Test Salon & Spa',
      email: 'bookings@testsalon.com',
      phone: '+1-555-0123',
      timezone: 'America/New_York',
      currency: 'USD'
    });
    console.log(`✅ Tenant created: ${tenant.id}\n`);

    // Clear existing appointments to prevent conflicts in tests
    await query('DELETE FROM appointments WHERE tenant_id = $1', [tenant.id]);
    console.log('🧹 Cleared existing appointments\n');

    // 3. Create test services
    console.log('3️⃣ Creating test services...');

    const services = [
      {
        name: 'Haircut',
        description: 'Professional haircut and styling',
        category: 'Hair',
        duration_minutes: 30,
        price_cents: 3000,
        buffer_time_after: 10,
        online_booking_enabled: true,
        status: 'active'
      },
      {
        name: 'Hair Coloring',
        description: 'Full hair coloring service',
        category: 'Hair',
        duration_minutes: 90,
        price_cents: 8000,
        buffer_time_after: 15,
        online_booking_enabled: true,
        status: 'active'
      },
      {
        name: 'Massage - 60min',
        description: 'Relaxing full body massage',
        category: 'Spa',
        duration_minutes: 60,
        price_cents: 7500,
        buffer_time_after: 15,
        online_booking_enabled: true,
        status: 'active'
      },
      {
        name: 'Facial Treatment',
        description: 'Deep cleansing facial treatment',
        category: 'Spa',
        duration_minutes: 45,
        price_cents: 6500,
        buffer_time_after: 10,
        online_booking_enabled: true,
        status: 'active'
      }
    ];

    const createdServices = [];
    for (const serviceData of services) {
      const service = await bookingService.createService(tenant.id, serviceData);
      createdServices.push(service);
      console.log(`   ✅ ${service.name} - $${service.price_cents / 100}`);
    }
    console.log(`✅ Created ${createdServices.length} services\n`);

    // 4. Create default staff member
    console.log('4️⃣ Creating staff member...');
    const staff = await bookingService.getOrCreateDefaultStaff(tenant.id, {
      name: 'Sarah Johnson',
      email: 'sarah@testsalon.com',
      phone: '+1-555-0124',
      bio: 'Experienced stylist with 10+ years',
      buffer_time_after: 10,
      min_advance_booking_hours: 2
    });
    console.log(`✅ Staff member created: ${staff.name}\n`);

    // 5. Set availability rules (Mon-Fri, 9AM-5PM)
    console.log('5️⃣ Setting availability rules...');

    // Clear existing rules for this staff
    await query('DELETE FROM booking_availability_rules WHERE staff_id = $1', [staff.id]);

    // Create rules for all days (0-6) - need tenant_id
    for (let day = 0; day <= 6; day++) {
      await query(
        `INSERT INTO booking_availability_rules (tenant_id, staff_id, day_of_week, start_time, end_time, is_available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tenant.id, staff.id, day, '09:00', '17:00', true]
      );
    }
    console.log('✅ Set Mon-Fri 9AM-5PM availability\n');

    // 6. Create a sample appointment (for testing cancellation)
    console.log('6️⃣ Creating sample appointment...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0); // 10 AM tomorrow

    const sampleAppointment = await bookingService.createAppointment(
      tenant.id,
      {
        service_id: createdServices[0].id,
        staff_id: staff.id,
        customer_name: 'Sample Customer',
        customer_email: 'sample@example.com',
        customer_phone: '+1-555-9999',
        start_time: tomorrow.toISOString(),
        timezone: 'America/New_York',
        notes: 'Sample appointment for testing'
      }
    );
    console.log(`✅ Sample appointment created: ${sampleAppointment.confirmation_code}\n`);

    // Summary
    console.log('='.repeat(50));
    console.log('🎉 Test data seeding complete!\n');
    console.log('📊 Summary:');
    console.log(`   - User ID: ${testUserId}`);
    console.log(`   - Tenant ID: ${tenant.id}`);
    console.log(`   - Services: ${createdServices.length}`);
    console.log(`   - Staff: 1 (${staff.name})`);
    console.log(`   - Availability: Mon-Fri 9AM-5PM`);
    console.log(`   - Sample appointment: ${sampleAppointment.confirmation_code}`);
    console.log('\n✅ Ready for E2E testing!\n');
    console.log('🧪 Run E2E tests:');
    console.log('   npx playwright test tests/e2e/booking-complete-flow.spec.js\n');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seedTestData;

