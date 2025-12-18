import { query } from '../database/db.js';

async function getTestUserId() {
    try {
        const result = await query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
        if (result.rows.length > 0) {
            console.log(result.rows[0].id);
        } else {
            console.error('User not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

getTestUserId();
