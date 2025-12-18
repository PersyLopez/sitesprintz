import { prisma } from '../../database/db.js';

/**
 * Execute a test within a Prisma transaction that always rolls back.
 * This ensures no data is persisted to the database after the test.
 * 
 * @param {Function} testFn - The test function which receives the transactional prisma client
 * @returns {Promise<void>}
 */
export async function withTransaction(testFn) {
    try {
        await prisma.$transaction(async (tx) => {
            await testFn(tx);
            // throw error to ensure rollback
            throw new Error('ROLLBACK');
        });
    } catch (error) {
        if (error.message !== 'ROLLBACK') {
            throw error;
        }
    }
}

/**
 * Alternative pattern for Vitest beforeEach/afterEach (Rule 7 recommended)
 * Note: Standard Prisma does not have $begin/$rollback publicly on the main client.
 * This pattern simulates it using a managed transaction.
 */
export class PrismaTransactionManager {
    constructor() {
        this.tx = null;
        this._resolve = null;
        this._reject = null;
        this._txPromise = null;
    }

    async start() {
        this._txPromise = new Promise((resolve, reject) => {
            prisma.$transaction(async (tx) => {
                this.tx = tx;
                resolve(); // Signal that tx is ready
                return new Promise((res, rej) => {
                    this._resolve = res;
                    this._reject = rej;
                });
            }).catch(err => {
                if (err.message !== 'ROLLBACK') {
                    reject(err);
                }
            });
        });
        return this._txPromise;
    }

    async rollback() {
        if (this._reject) {
            this._reject(new Error('ROLLBACK'));
        }
        await this._txPromise;
    }
}
