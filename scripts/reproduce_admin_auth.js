
import dotenv from 'dotenv';
import { prisma } from '../database/db.js';
import { generateAccessToken } from '../server/services/tokenService.js';
import jwt from 'jsonwebtoken';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

async function checkAdminAuth() {
    console.log('--- Checking Admin Auth ---');
    console.log('JWT_SECRET:', JWT_SECRET);

    // 1. Check User in DB
    const email = 'admin@example.com';
    const user = await prisma.users.findUnique({ where: { email } });

    if (!user) {
        console.error('❌ User not found:', email);
        return;
    }
    console.log('✅ User found:', { id: user.id, email: user.email, role: user.role, status: user.status });

    if (user.role !== 'admin') {
        console.error('❌ User is not admin!');
    } else {
        console.log('✅ User role is admin');
    }

    // 2. Generate Token
    const token = generateAccessToken(user);
    console.log('✅ Token generated');

    // 3. Verify Token
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token verified:', decoded);

        // 4. Simulate requireAdmin logic
        const dbUser = await prisma.users.findUnique({
            where: { id: decoded.userId || decoded.id }
        });

        if (!dbUser) {
            console.error('❌ User not found from token ID');
        } else if (dbUser.role !== 'admin') {
            console.error('❌ User from token is not admin');
        } else {
            console.log('✅ requireAdmin logic passed!');
        }

    } catch (e) {
        console.error('❌ Token verification failed:', e.message);
    }
}

checkAdminAuth()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
