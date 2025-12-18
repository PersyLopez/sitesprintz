import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Go up two levels from server/utils to get to root, then into public/users
const usersDir = path.join(__dirname, '../../public/users');

export function getUserFilePath(email) {
    const sanitized = email.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
    return path.join(usersDir, `${sanitized}.json`);
}

export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function isValidPhone(phone) {
    // Allow various phone formats
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;
    return phoneRegex.test(phone);
}

export function sanitizeString(str, maxLength = 500) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength);
}

export function generateRandomPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * Generate a secure verification token for email verification
 * @returns {string} A random 32-character hex string
 */
export function generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
}
