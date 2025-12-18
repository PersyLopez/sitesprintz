import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { prisma } from '../database/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runBookingSchema() {
    console.log('🚀 Running booking schema...');

    try {
        await prisma.$connect();
        console.log('✅ Connected to database');

        // Read schema file
        const schemaPath = join(__dirname, '../database/booking-schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf-8');

        // Execute schema
        // Split by semicolon and execute each statement
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await prisma.$executeRawUnsafe(statement);
        }

        console.log('✅ Booking schema executed successfully!');

        // Verify tables
        const result = await prisma.$queryRaw`
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public' AND tablename LIKE 'booking_%'
            ORDER BY tablename
        `;

        console.log('\n📊 Booking tables created:');
        result.forEach(row => console.log(`  - ${row.tablename}`));

        await prisma.$disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error running booking schema:', error);
        await prisma.$disconnect();
        process.exit(1);
    }
}

runBookingSchema();
