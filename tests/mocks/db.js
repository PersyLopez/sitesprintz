// Database mock for tests
import { vi } from 'vitest';

// Sample data for realistic mocking
const mockUsers = new Map();
const mockSites = new Map();
const mockSubmissions = new Map();
const mockAnalytics = new Map();
const mockProcessedWebhooks = new Map();
const mockOrders = new Map();
const mockOrderItems = new Map();
const mockProducts = new Map();
const mockSubscriptions = new Map();

// Helper to generate IDs
let idCounter = 1000;
const generateId = () => `mock-id-${idCounter++}`;

// Mock database query function with intelligent response handling
export const mockQuery = vi.fn().mockImplementation(async (text, params = []) => {
  const query = text.toLowerCase().trim();
  
  // INSERT queries - return inserted row with generated ID
  if (query.startsWith('insert into users')) {
    const id = params[0] || generateId();
    const email = params[1] || params[0] || 'test@example.com';
    const passwordHash = params[2] || params[1] || 'hashed';
    const role = params[3] || params[4] || 'user';
    const status = params[4] || params[3] || 'active';
    
    const user = {
      id,
      email,
      password_hash: passwordHash,
      status,
      role,
      plan: null,
      subscription_status: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockUsers.set(id, user);
    return {
      rows: [user],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into sites')) {
    const id = params[0] || generateId();
    const subdomain = params[1] || 'test-site';
    const templateId = params[2] || 'starter-1';
    const userId = params[3] || 'user-1';
    const status = params[4] || 'published';
    const siteData = params[5] || {};
    
    const site = {
      id,
      subdomain,
      template_id: templateId,
      user_id: userId,
      status,
      plan: 'free',
      site_data: siteData,
      published_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSites.set(id, site);
    return {
      rows: [site],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into submissions')) {
    const id = generateId();
    const siteId = params[0];
    const name = params[1];
    const email = params[2];
    const phone = params[3] || '';
    const message = params[4] || params[3];
    const type = params[5] || params[6] || 'contact';
    const status = params[6] || params[7] || 'unread';
    
    const submission = {
      id,
      site_id: siteId,
      name,
      email,
      phone,
      message,
      type,
      status,
      data: params[8] || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSubmissions.set(id, submission);
    return {
      rows: [submission],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into processed_webhooks')) {
    const id = params[0];
    const eventType = params[1];
    const data = params[2];
    
    const webhook = {
      id,
      event_type: eventType,
      data,
      processed_at: new Date().toISOString()
    };
    mockProcessedWebhooks.set(id, webhook);
    return {
      rows: [webhook],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into orders')) {
    const id = params[0];
    const siteId = params[1];
    const customerEmail = params[2];
    const total = params[3];
    const status = params[4];
    const stripeSessionId = params[5];
    
    const order = {
      id,
      site_id: siteId,
      customer_email: customerEmail,
      total,
      status,
      stripe_session_id: stripeSessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockOrders.set(id, order);
    return {
      rows: [order],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into order_items')) {
    const orderId = params[0];
    const name = params[1];
    const price = params[2];
    const quantity = params[3];
    
    const id = generateId();
    const item = {
      id,
      order_id: orderId,
      name,
      price,
      quantity,
      created_at: new Date().toISOString()
    };
    mockOrderItems.set(id, item);
    return {
      rows: [item],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('insert into subscriptions')) {
    const id = params[0];
    const userId = params[1];
    const stripeSubscriptionId = params[2];
    const stripeCustomerId = params[3];
    const status = params[4];
    const plan = params[5];
    
    const subscription = {
      id,
      user_id: userId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_customer_id: stripeCustomerId,
      status,
      plan,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockSubscriptions.set(id, subscription);
    return {
      rows: [subscription],
      rowCount: 1,
      command: 'INSERT',
      oid: null,
      fields: []
    };
  }
  
  // SELECT queries - return matching data
  if (query.includes('select') && query.includes('from users')) {
    if (query.includes('where email')) {
      const email = params[0];
      const user = Array.from(mockUsers.values()).find(u => u.email === email);
      return {
        rows: user ? [user] : [],
        rowCount: user ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('where id')) {
      const id = params[0];
      const user = mockUsers.get(id);
      return {
        rows: user ? [user] : [],
        rowCount: user ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('where stripe_customer_id')) {
      const stripeCustomerId = params[0];
      const user = Array.from(mockUsers.values()).find(u => u.stripe_customer_id === stripeCustomerId);
      return {
        rows: user ? [user] : [],
        rowCount: user ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('where stripe_subscription_id')) {
      const stripeSubId = params[0];
      const user = Array.from(mockUsers.values()).find(u => u.stripe_subscription_id === stripeSubId);
      return {
        rows: user ? [user] : [],
        rowCount: user ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    // Get all users (for admin endpoints)
    return {
      rows: Array.from(mockUsers.values()),
      rowCount: mockUsers.size,
      command: 'SELECT',
      oid: null,
      fields: []
    };
  }
  
  if (query.includes('select') && query.includes('from sites')) {
    if (query.includes('where subdomain')) {
      const subdomain = params[0];
      const site = Array.from(mockSites.values()).find(s => s.subdomain === subdomain);
      
      // If query joins with users, include user email
      if (query.includes('join users') || query.includes('u.email')) {
        if (site) {
          const user = mockUsers.get(site.user_id);
          return {
            rows: [{
              ...site,
              owner_email: user?.email || 'owner@example.com'
            }],
            rowCount: 1,
            command: 'SELECT',
            oid: null,
            fields: []
          };
        }
      }
      
      return {
        rows: site ? [site] : [],
        rowCount: site ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('where user_id') || query.includes('where s.user_id')) {
      const userId = params[0];
      const sites = Array.from(mockSites.values()).filter(s => s.user_id === userId);
      return {
        rows: sites,
        rowCount: sites.length,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('count(*)')) {
      // Site count query
      const userId = params[0];
      const count = Array.from(mockSites.values()).filter(s => s.user_id === userId && s.status !== 'deleted').length;
      return {
        rows: [{ site_count: count.toString() }],
        rowCount: 1,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    // Get all sites
    return {
      rows: Array.from(mockSites.values()),
      rowCount: mockSites.size,
      command: 'SELECT',
      oid: null,
      fields: []
    };
  }
  
  if (query.includes('select') && query.includes('from submissions')) {
    if (query.includes('where site_id')) {
      const siteId = params[0];
      const submissions = Array.from(mockSubmissions.values()).filter(s => s.site_id === siteId);
      return {
        rows: submissions,
        rowCount: submissions.length,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    if (query.includes('where sub.id') || query.includes('where id')) {
      const id = params[0];
      const submission = mockSubmissions.get(id);
      
      // If query joins with sites and users, include owner email
      if (query.includes('join sites') || query.includes('join users')) {
        if (submission) {
          const site = Array.from(mockSites.values()).find(s => s.id === submission.site_id);
          const user = site ? mockUsers.get(site.user_id) : null;
          return {
            rows: [{
              ...submission,
              owner_email: user?.email || 'owner@example.com'
            }],
            rowCount: 1,
            command: 'SELECT',
            oid: null,
            fields: []
          };
        }
      }
      
      return {
        rows: submission ? [submission] : [],
        rowCount: submission ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    // Get all submissions with joins
    if (query.includes('join sites') && query.includes('join users')) {
      const userId = params[0];
      const userSites = Array.from(mockSites.values()).filter(s => s.user_id === userId);
      const siteIds = userSites.map(s => s.id);
      const submissions = Array.from(mockSubmissions.values())
        .filter(sub => siteIds.includes(sub.site_id))
        .map(sub => {
          const site = userSites.find(s => s.id === sub.site_id);
          return {
            ...sub,
            subdomain: site?.subdomain,
            site_data: site?.site_data
          };
        });
      return {
        rows: submissions,
        rowCount: submissions.length,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    // Get all submissions
    return {
      rows: Array.from(mockSubmissions.values()),
      rowCount: mockSubmissions.size,
      command: 'SELECT',
      oid: null,
      fields: []
    };
  }
  
  if (query.includes('select') && query.includes('from processed_webhooks')) {
    if (query.includes('where id')) {
      const id = params[0];
      const webhook = mockProcessedWebhooks.get(id);
      return {
        rows: webhook ? [webhook] : [],
        rowCount: webhook ? 1 : 0,
        command: 'SELECT',
        oid: null,
        fields: []
      };
    }
    return {
      rows: Array.from(mockProcessedWebhooks.values()),
      rowCount: mockProcessedWebhooks.size,
      command: 'SELECT',
      oid: null,
      fields: []
    };
  }
  
  // UPDATE queries
  if (query.startsWith('update users')) {
    // Find user by various criteria
    let user = null;
    if (query.includes('where id')) {
      const id = params[params.length - 1];
      user = mockUsers.get(id);
    } else if (query.includes('where stripe_customer_id')) {
      const stripeCustomerId = params[params.length - 1];
      user = Array.from(mockUsers.values()).find(u => u.stripe_customer_id === stripeCustomerId);
    } else if (query.includes('where stripe_subscription_id')) {
      const stripeSubId = params[params.length - 1];
      user = Array.from(mockUsers.values()).find(u => u.stripe_subscription_id === stripeSubId);
    }
    
    if (user) {
      // Update specific fields based on query
      if (query.includes('subscription_status')) {
        user.subscription_status = params[0];
      }
      if (query.includes('password_hash')) {
        user.password_hash = params[0];
      }
      if (query.includes('plan')) {
        const planIndex = query.indexOf('plan =');
        if (planIndex !== -1) {
          // Find which param is the plan
          const setPart = query.substring(query.indexOf('set'), query.indexOf('where')).toLowerCase();
          const planParamMatch = setPart.match(/plan\s*=\s*\$(\d+)/);
          if (planParamMatch) {
            const planParamNum = parseInt(planParamMatch[1]) - 1;
            user.plan = params[planParamNum];
          }
        }
      }
      if (query.includes('stripe_subscription_id')) {
        const subIdMatch = query.match(/stripe_subscription_id\s*=\s*\$(\d+)/);
        if (subIdMatch) {
          const subIdParamNum = parseInt(subIdMatch[1]) - 1;
          user.stripe_subscription_id = params[subIdParamNum];
        }
      }
      if (query.includes('stripe_customer_id')) {
        const custIdMatch = query.match(/stripe_customer_id\s*=\s*\$(\d+)/);
        if (custIdMatch) {
          const custIdParamNum = parseInt(custIdMatch[1]) - 1;
          user.stripe_customer_id = params[custIdParamNum];
        }
      }
      user.updated_at = new Date().toISOString();
      mockUsers.set(user.id, user);
    }
    return {
      rows: [],
      rowCount: user ? 1 : 0,
      command: 'UPDATE',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('update sites')) {
    const subdomain = params[params.length - 1];
    const site = Array.from(mockSites.values()).find(s => s.subdomain === subdomain);
    if (site) {
      // Update site_data if present
      if (query.includes('site_data')) {
        site.site_data = params[0];
      }
      if (query.includes('status')) {
        site.status = params[0];
      }
      site.updated_at = new Date().toISOString();
      mockSites.set(site.id, site);
    }
    return {
      rows: [],
      rowCount: site ? 1 : 0,
      command: 'UPDATE',
      oid: null,
      fields: []
    };
  }
  
  if (query.startsWith('update submissions')) {
    const id = params[params.length - 1];
    const submission = mockSubmissions.get(id);
    if (submission) {
      if (query.includes('status')) {
        submission.status = params[0] || 'read';
      }
      submission.updated_at = new Date().toISOString();
      mockSubmissions.set(id, submission);
    }
    return {
      rows: [],
      rowCount: submission ? 1 : 0,
      command: 'UPDATE',
      oid: null,
      fields: []
    };
  }
  
  // DELETE queries
  if (query.startsWith('delete from')) {
    if (query.includes('users')) {
      const id = params[0];
      const existed = mockUsers.has(id);
      mockUsers.delete(id);
      return {
        rows: [],
        rowCount: existed ? 1 : 0,
        command: 'DELETE',
        oid: null,
        fields: []
      };
    }
    if (query.includes('sites')) {
      const id = params[0];
      const existed = mockSites.has(id);
      mockSites.delete(id);
      return {
        rows: [],
        rowCount: existed ? 1 : 0,
        command: 'DELETE',
        oid: null,
        fields: []
      };
    }
    if (query.includes('submissions')) {
      const id = params[0];
      const existed = mockSubmissions.has(id);
      mockSubmissions.delete(id);
      return {
        rows: [],
        rowCount: existed ? 1 : 0,
        command: 'DELETE',
        oid: null,
        fields: []
      };
    }
  }
  
  // Transaction control commands
  if (query === 'begin') {
    return {
      rows: [],
      rowCount: 0,
      command: 'BEGIN',
      oid: null,
      fields: []
    };
  }
  
  if (query === 'commit') {
    return {
      rows: [],
      rowCount: 0,
      command: 'COMMIT',
      oid: null,
      fields: []
    };
  }
  
  if (query === 'rollback') {
    return {
      rows: [],
      rowCount: 0,
      command: 'ROLLBACK',
      oid: null,
      fields: []
    };
  }
  
  // Default fallback for any other query
  console.warn('Unhandled database query:', query.substring(0, 100));
  return {
    rows: [],
    rowCount: 0,
    command: 'SELECT',
    oid: null,
    fields: []
  };
});

// Mock database transaction function
export const mockTransaction = vi.fn().mockImplementation(async (callback) => {
  const mockClient = {
    query: mockQuery,
    release: vi.fn(),
  };
  try {
    await mockClient.query('BEGIN');
    const result = await callback(mockClient);
    await mockClient.query('COMMIT');
    return result;
  } catch (error) {
    await mockClient.query('ROLLBACK');
    throw error;
  } finally {
    mockClient.release();
  }
});

// Mock database pool
export const mockPool = {
  query: mockQuery,
  connect: vi.fn().mockResolvedValue({
    query: mockQuery,
    release: vi.fn()
  }),
  end: vi.fn(),
  on: vi.fn(),
};

// Helper to reset all mocks and data
export function resetDbMocks() {
  mockQuery.mockClear();
  mockTransaction.mockClear();
  mockUsers.clear();
  mockSites.clear();
  mockSubmissions.clear();
  mockAnalytics.clear();
  mockProcessedWebhooks.clear();
  mockOrders.clear();
  mockOrderItems.clear();
  mockSubscriptions.clear();
  idCounter = 1000;
}

// Helper to seed test data
export function seedTestData(data = {}) {
  if (data.users) {
    data.users.forEach(user => mockUsers.set(user.id, user));
  }
  if (data.sites) {
    data.sites.forEach(site => mockSites.set(site.id, site));
  }
  if (data.submissions) {
    data.submissions.forEach(sub => mockSubmissions.set(sub.id, sub));
  }
}

// Helper to set up successful query response
export function mockQuerySuccess(rows = [], rowCount = 0) {
  mockQuery.mockResolvedValueOnce({
    rows,
    rowCount: rowCount || rows.length,
    command: 'SELECT',
    oid: null,
    fields: []
  });
}

// Helper to set up query error
export function mockQueryError(error) {
  mockQuery.mockRejectedValueOnce(error);
}

export default {
  query: mockQuery,
  transaction: mockTransaction,
  pool: mockPool,
  resetDbMocks,
  seedTestData,
  mockQuerySuccess,
  mockQueryError,
};

