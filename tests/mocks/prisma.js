/**
 * Prisma Mock for Integration Tests
 * 
 * Provides realistic Prisma Client mocking for integration tests
 * Handles common Prisma operations: findUnique, findMany, create, update, delete, etc.
 */

import { vi } from 'vitest';

// In-memory data stores
const mockData = {
  users: new Map(),
  sites: new Map(),
  submissions: new Map(),
  orders: new Map(),
  orderItems: new Map(),
  subscriptions: new Map(),
  processedWebhooks: new Map(),
  planFeatures: new Map(),
  pricing: new Map(),
  bookingTenants: new Map(),
  bookingServices: new Map(),
  bookingStaff: new Map(),
  appointments: new Map(),
};

// Helper to generate IDs
let idCounter = 1000;
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `mock-id-${idCounter++}`;
};

// Helper to find by ID
const findById = (map, id) => {
  return map.get(id) || null;
};

// Helper to find by field
const findByField = (map, field, value) => {
  return Array.from(map.values()).find(item => item[field] === value) || null;
};

// Helper to filter by field
const filterByField = (map, field, value) => {
  return Array.from(map.values()).filter(item => item[field] === value);
};

// Helper to create Prisma-style result
const createResult = (data) => {
  if (Array.isArray(data)) {
    return data;
  }
  return data || null;
};

// Mock Prisma Client
export const createMockPrisma = () => {
  const mockPrisma = {
    // Users model
    users: {
      findUnique: vi.fn(({ where }) => {
        if (where.id) return Promise.resolve(findById(mockData.users, where.id));
        if (where.email) return Promise.resolve(findByField(mockData.users, 'email', where.email));
        if (where.stripe_customer_id) return Promise.resolve(findByField(mockData.users, 'stripe_customer_id', where.stripe_customer_id));
        if (where.verification_token) return Promise.resolve(findByField(mockData.users, 'verification_token', where.verification_token));
        if (where.password_reset_token) return Promise.resolve(findByField(mockData.users, 'password_reset_token', where.password_reset_token));
        return Promise.resolve(null);
      }),
      findMany: vi.fn(({ where, orderBy } = {}) => {
        let results = Array.from(mockData.users.values());
        if (where) {
          if (where.role) results = results.filter(u => u.role === where.role);
          if (where.status) results = results.filter(u => u.status === where.status);
          if (where.email_verified !== undefined) {
            results = results.filter(u => u.email_verified === where.email_verified);
          }
        }
        if (orderBy) {
          const [field, direction] = Object.entries(orderBy)[0];
          results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (direction === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
        return Promise.resolve(results);
      }),
      create: vi.fn(({ data }) => {
        const id = data.id || generateId();
        const user = {
          id,
          email: data.email?.toLowerCase() || 'test@example.com',
          password_hash: data.password_hash || 'hashed',
          role: data.role || 'user',
          status: data.status || 'pending',
          email_verified: data.email_verified || false,
          subscription_status: data.subscription_status || null,
          subscription_plan: data.subscription_plan || null,
          stripe_customer_id: data.stripe_customer_id || null,
          created_at: new Date(),
          updated_at: new Date(),
          ...data
        };
        mockData.users.set(id, user);
        return Promise.resolve(user);
      }),
      update: vi.fn(({ where, data }) => {
        let user = null;
        if (where.id) user = findById(mockData.users, where.id);
        if (where.email && !user) user = findByField(mockData.users, 'email', where.email);
        
        if (user) {
          Object.assign(user, data, { updated_at: new Date() });
          mockData.users.set(user.id, user);
          return Promise.resolve(user);
        }
        return Promise.reject(new Error('User not found'));
      }),
      delete: vi.fn(({ where }) => {
        const user = findById(mockData.users, where.id);
        if (user) {
          mockData.users.delete(where.id);
          return Promise.resolve(user);
        }
        return Promise.reject(new Error('User not found'));
      }),
      count: vi.fn(({ where } = {}) => {
        let count = mockData.users.size;
        if (where) {
          const filtered = Array.from(mockData.users.values()).filter(u => {
            if (where.role && u.role !== where.role) return false;
            if (where.status && u.status !== where.status) return false;
            return true;
          });
          count = filtered.length;
        }
        return Promise.resolve(count);
      })
    },

    // Sites model
    sites: {
      findUnique: vi.fn(({ where }) => {
        if (where.id) return Promise.resolve(findById(mockData.sites, where.id));
        if (where.subdomain) return Promise.resolve(findByField(mockData.sites, 'subdomain', where.subdomain));
        return Promise.resolve(null);
      }),
      findMany: vi.fn(({ where, orderBy } = {}) => {
        let results = Array.from(mockData.sites.values());
        if (where) {
          if (where.user_id) results = results.filter(s => s.user_id === where.user_id);
          if (where.status) results = results.filter(s => s.status === where.status);
          if (where.plan) results = results.filter(s => s.plan === where.plan);
        }
        if (orderBy) {
          const [field, direction] = Object.entries(orderBy)[0];
          results.sort((a, b) => {
            const aVal = a[field];
            const bVal = b[field];
            if (direction === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
        return Promise.resolve(results);
      }),
      create: vi.fn(({ data }) => {
        const id = data.id || generateId();
        const site = {
          id,
          subdomain: data.subdomain || `site-${id}`,
          template_id: data.template_id || 'starter-1',
          user_id: data.user_id || 'user-123',
          status: data.status || 'draft',
          plan: data.plan || 'free',
          site_data: data.site_data || {},
          published_at: data.published_at || null,
          expires_at: data.expires_at || null,
          created_at: new Date(),
          updated_at: new Date(),
          ...data
        };
        mockData.sites.set(id, site);
        return Promise.resolve(site);
      }),
      update: vi.fn(({ where, data }) => {
        const site = findById(mockData.sites, where.id) || 
                    findByField(mockData.sites, 'subdomain', where.subdomain);
        if (site) {
          Object.assign(site, data, { updated_at: new Date() });
          mockData.sites.set(site.id, site);
          return Promise.resolve(site);
        }
        return Promise.reject(new Error('Site not found'));
      }),
      delete: vi.fn(({ where }) => {
        const site = findById(mockData.sites, where.id);
        if (site) {
          mockData.sites.delete(where.id);
          return Promise.resolve(site);
        }
        return Promise.reject(new Error('Site not found'));
      }),
      count: vi.fn(({ where } = {}) => {
        let count = mockData.sites.size;
        if (where) {
          const filtered = Array.from(mockData.sites.values()).filter(s => {
            if (where.user_id && s.user_id !== where.user_id) return false;
            if (where.status && s.status !== where.status) return false;
            return true;
          });
          count = filtered.length;
        }
        return Promise.resolve(count);
      })
    },

    // Submissions model
    submissions: {
      findUnique: vi.fn(({ where }) => {
        return Promise.resolve(findById(mockData.submissions, where.id));
      }),
      findMany: vi.fn(({ where, orderBy } = {}) => {
        let results = Array.from(mockData.submissions.values());
        if (where) {
          if (where.site_id) results = results.filter(s => s.site_id === where.site_id);
          if (where.status) results = results.filter(s => s.status === where.status);
        }
        return Promise.resolve(results);
      }),
      create: vi.fn(({ data }) => {
        const id = generateId();
        const submission = {
          id,
          site_id: data.site_id,
          form_type: data.form_type || 'contact',
          data: data.data || {},
          status: data.status || 'unread',
          created_at: new Date(),
          ...data
        };
        mockData.submissions.set(id, submission);
        return Promise.resolve(submission);
      }),
      update: vi.fn(({ where, data }) => {
        const submission = findById(mockData.submissions, where.id);
        if (submission) {
          Object.assign(submission, data);
          mockData.submissions.set(submission.id, submission);
          return Promise.resolve(submission);
        }
        return Promise.reject(new Error('Submission not found'));
      }),
      delete: vi.fn(({ where }) => {
        const submission = findById(mockData.submissions, where.id);
        if (submission) {
          mockData.submissions.delete(where.id);
          return Promise.resolve(submission);
        }
        return Promise.reject(new Error('Submission not found'));
      })
    },

    // Orders model
    orders: {
      findUnique: vi.fn(({ where }) => {
        return Promise.resolve(findById(mockData.orders, where.id));
      }),
      findMany: vi.fn(({ where } = {}) => {
        let results = Array.from(mockData.orders.values());
        if (where) {
          if (where.site_id) results = results.filter(o => o.site_id === where.site_id);
          if (where.status) results = results.filter(o => o.status === where.status);
        }
        return Promise.resolve(results);
      }),
      create: vi.fn(({ data }) => {
        const id = data.id || generateId();
        const order = {
          id,
          site_id: data.site_id,
          stripe_session_id: data.stripe_session_id || null,
          customer_email: data.customer_email,
          amount: data.amount,
          currency: data.currency || 'usd',
          status: data.status || 'pending',
          created_at: new Date(),
          updated_at: new Date(),
          ...data
        };
        mockData.orders.set(id, order);
        return Promise.resolve(order);
      }),
      update: vi.fn(({ where, data }) => {
        const order = findById(mockData.orders, where.id);
        if (order) {
          Object.assign(order, data, { updated_at: new Date() });
          mockData.orders.set(order.id, order);
          return Promise.resolve(order);
        }
        return Promise.reject(new Error('Order not found'));
      })
    },

    // Plan Features model
    plan_features: {
      findMany: vi.fn(({ where } = {}) => {
        let results = Array.from(mockData.planFeatures.values());
        if (where) {
          if (where.plan) results = results.filter(pf => pf.plan === where.plan);
          if (where.enabled !== undefined) results = results.filter(pf => pf.enabled === where.enabled);
        }
        return Promise.resolve(results);
      }),
      create: vi.fn(({ data }) => {
        const id = generateId();
        const feature = {
          id,
          plan: data.plan,
          feature: data.feature,
          enabled: data.enabled !== undefined ? data.enabled : true,
          created_at: new Date(),
          updated_at: new Date()
        };
        const key = `${data.plan}-${data.feature}`;
        mockData.planFeatures.set(key, feature);
        return Promise.resolve(feature);
      }),
      updateMany: vi.fn(({ where, data }) => {
        const features = Array.from(mockData.planFeatures.values()).filter(pf => {
          if (where.plan && pf.plan !== where.plan) return false;
          return true;
        });
        features.forEach(feature => {
          Object.assign(feature, data, { updated_at: new Date() });
          const key = `${feature.plan}-${feature.feature}`;
          mockData.planFeatures.set(key, feature);
        });
        return Promise.resolve({ count: features.length });
      }),
      upsert: vi.fn(({ where, create, update }) => {
        const key = `${where.plan}-${where.feature}`;
        const existing = mockData.planFeatures.get(key);
        if (existing) {
          Object.assign(existing, update, { updated_at: new Date() });
          return Promise.resolve(existing);
        } else {
          const feature = {
            id: generateId(),
            plan: create.plan,
            feature: create.feature,
            enabled: create.enabled !== undefined ? create.enabled : true,
            created_at: new Date(),
            updated_at: new Date()
          };
          mockData.planFeatures.set(key, feature);
          return Promise.resolve(feature);
        }
      })
    },

    // Raw SQL queries
    $queryRaw: vi.fn((query) => {
      // Handle common raw queries
      if (query && typeof query === 'object' && query.strings) {
        const sql = query.strings.join('?').toLowerCase();
        
        // SELECT COUNT(*) FROM plan_features
        if (sql.includes('select count(*)') && sql.includes('plan_features')) {
          return Promise.resolve([{ count: mockData.planFeatures.size }]);
        }
        
        // SELECT plan, feature, enabled FROM plan_features
        if (sql.includes('select') && sql.includes('plan_features')) {
          const results = Array.from(mockData.planFeatures.values()).map(pf => ({
            plan: pf.plan,
            feature: pf.feature,
            enabled: pf.enabled
          }));
          return Promise.resolve(results);
        }
      }
      
      // Default: return empty result
      return Promise.resolve([]);
    }),

    $executeRaw: vi.fn((query) => {
      // Handle UPDATE queries
      if (query && typeof query === 'object' && query.strings) {
        const sql = query.strings.join('?').toLowerCase();
        if (sql.includes('update plan_features')) {
          return Promise.resolve({ count: 0 });
        }
      }
      return Promise.resolve({ count: 0 });
    }),

    // Transactions
    $transaction: vi.fn(async (callback) => {
      try {
        return await callback(mockPrisma);
      } catch (error) {
        throw error;
      }
    }),

    // Disconnect
    $disconnect: vi.fn(() => Promise.resolve())
  };

  return mockPrisma;
};

// Reset all mock data
export const resetPrismaMocks = () => {
  mockData.users.clear();
  mockData.sites.clear();
  mockData.submissions.clear();
  mockData.orders.clear();
  mockData.orderItems.clear();
  mockData.subscriptions.clear();
  mockData.processedWebhooks.clear();
  mockData.planFeatures.clear();
  mockData.pricing.clear();
  mockData.bookingTenants.clear();
  mockData.bookingServices.clear();
  mockData.bookingStaff.clear();
  mockData.appointments.clear();
  idCounter = 1000;
};

// Seed test data
export const seedPrismaData = (data = {}) => {
  if (data.users) {
    data.users.forEach(user => mockData.users.set(user.id, user));
  }
  if (data.sites) {
    data.sites.forEach(site => mockData.sites.set(site.id, site));
  }
  if (data.submissions) {
    data.submissions.forEach(sub => mockData.submissions.set(sub.id, sub));
  }
  if (data.orders) {
    data.orders.forEach(order => mockData.orders.set(order.id, order));
  }
  if (data.planFeatures) {
    data.planFeatures.forEach(pf => {
      const key = `${pf.plan}-${pf.feature}`;
      mockData.planFeatures.set(key, pf);
    });
  }
};

// Export default mock instance
export const mockPrisma = createMockPrisma();

export default {
  createMockPrisma,
  resetPrismaMocks,
  seedPrismaData,
  mockPrisma,
  mockData
};






