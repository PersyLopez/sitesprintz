# Stability Patterns

> Reference guide from "Release It!" - Design patterns that prevent and contain failures

## Overview

Patterns are proven solutions that stop cracks from propagating through your system. While antipatterns accelerate failures, patterns are "crackstoppers" that contain damage and preserve functionality.

**Key Principle**: *Bugs will happen. We can't eliminate all faults, so we must prevent them from becoming errors and failures.*

---

## Pattern Philosophy

### Fault Tolerance vs. "Let It Crash"

Two philosophies for handling faults:

**Fault Tolerance Camp**:
- Catch exceptions
- Check error codes
- Recover from faults
- Keep system running despite errors

**Let It Crash Camp**:
- Trying to catch everything is futile
- Unexpected errors will always occur
- Better to crash and restart from known-good state
- Supervision trees manage restarts

**Both agree**:
- Faults will happen (can't be prevented)
- Must keep faults from becoming failures
- Need mechanisms to isolate and recover

---

## Timeouts

**Prevent operations from blocking forever**

### Problem

Without timeouts, a call can block indefinitely:
- Database query that never returns
- HTTP request to dead server
- Socket read that waits forever
- Resource pool checkout that blocks

**One blocked thread reduces capacity. All blocked threads = outage.**

### Solution

Set time limits on all blocking operations:

```javascript
// Bad: Can block forever
const result = await externalAPI.call();

// Good: Will timeout after 5 seconds
const result = await Promise.race([
    externalAPI.call(),
    timeout(5000)
]);
```

### Implementation Patterns

#### Socket Timeouts

```javascript
// Node.js
const socket = new net.Socket();
socket.setTimeout(5000);
socket.on('timeout', () => {
    socket.destroy();
    reject(new Error('Socket timeout'));
});
```

#### HTTP Client Timeouts

```javascript
// Multiple timeout types
const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),  // Overall timeout
    // Some libraries support separate:
    // connectTimeout: 2000,  // Time to establish connection
    // readTimeout: 5000      // Time to receive response
});
```

#### Database Query Timeouts

```javascript
// PostgreSQL
await client.query({
    text: 'SELECT * FROM large_table',
    statement_timeout: 10000  // 10 second timeout
});
```

#### Resource Pool Timeouts

```javascript
// Connection pool with timeout
const conn = await pool.getConnection({
    timeout: 5000  // Don't wait more than 5 sec
});
```

### Timeout Values

**Guidelines**:
- **Too short**: False positives, unnecessary failures
- **Too long**: Resources tied up, slow failure detection

**Recommendations**:
- Start with **95th percentile + buffer** (e.g., p95 = 2s, use 5s timeout)
- **Connection timeout**: 2-5 seconds
- **Read timeout**: 10-30 seconds (depends on operation)
- **Database queries**: 5-30 seconds
- **External APIs**: 5-10 seconds

**Different timeouts for different operations**:
```javascript
const TIMEOUTS = {
    FAST_QUERY: 1000,      // < 1 second
    STANDARD_QUERY: 5000,   // 5 seconds
    SLOW_QUERY: 30000,      // 30 seconds
    REPORT_QUERY: 120000    // 2 minutes
};
```

### Delayed Retries

**Problem**: Fast failures can still overload
```
Timeout after 5 sec
Retry immediately
Timeout after 5 sec
Retry immediately
Result: Hammer failing service
```

**Solution**: Exponential backoff
```javascript
async function retryWithBackoff(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) throw error;
            
            const delay = Math.min(
                1000 * Math.pow(2, attempt),  // Exponential
                10000                          // Cap at 10 sec
            );
            await sleep(delay);
        }
    }
}
```

### Remember This

- ✅ **Set timeouts on all blocking operations** (no exceptions)
- ✅ **Choose timeout values based on SLA + buffer**
- ✅ **Use delayed retries** (exponential backoff)
- ✅ **Different operations need different timeouts**
- ✅ **Monitor timeout rates** (high rate indicates problems)

---

## Circuit Breaker

**Stop calling a failing service**

### Problem

When a service fails, callers keep hammering it:
```
Service A calls Service B
Service B is down
Service A tries anyway
Service A's thread blocks/times out
More Service A threads block
Service A runs out of capacity
Service A is now effectively down too
```

**Without circuit breaker**: Cascading failure

### Solution

Monitor failures, stop calling when threshold exceeded:

```
States: CLOSED → OPEN → HALF_OPEN → CLOSED
        (normal) (failing) (testing) (recovered)
```

**State machine**:
```
CLOSED (normal operation):
    - Calls pass through
    - Count failures
    - If failures > threshold → OPEN

OPEN (service unavailable):
    - Calls fail immediately (don't call service)
    - After timeout period → HALF_OPEN

HALF_OPEN (testing recovery):
    - Allow one test call
    - If success → CLOSED
    - If failure → OPEN
```

### Implementation

```javascript
class CircuitBreaker {
    constructor(options = {}) {
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000;  // 1 min
        this.state = 'CLOSED';
        this.failures = 0;
        this.nextAttempt = null;
    }
    
    async execute(operation, fallback = null) {
        // Check if circuit is open
        if (this.state === 'OPEN') {
            if (Date.now() < this.nextAttempt) {
                console.warn('Circuit is OPEN');
                if (fallback) return fallback();
                throw new Error('Circuit breaker is OPEN');
            }
            // Try to recover
            this.state = 'HALF_OPEN';
        }
        
        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }
    
    onSuccess() {
        this.failures = 0;
        if (this.state === 'HALF_OPEN') {
            console.log('Circuit recovered → CLOSED');
            this.state = 'CLOSED';
        }
    }
    
    onFailure() {
        this.failures++;
        if (this.failures >= this.failureThreshold) {
            console.error(`Circuit opening after ${this.failures} failures`);
            this.state = 'OPEN';
            this.nextAttempt = Date.now() + this.resetTimeout;
        }
    }
    
    getState() {
        return {
            state: this.state,
            failures: this.failures,
            nextAttempt: this.nextAttempt
        };
    }
}
```

### Usage

```javascript
const dbCircuit = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000
});

async function queryDatabase(sql) {
    return dbCircuit.execute(
        () => db.query(sql),
        () => {
            // Fallback: return cached data
            return cache.get(sql);
        }
    );
}
```

### Fallback Strategies

**When circuit opens, what to do?**

1. **Return cached data** (best for reads)
2. **Return default/empty value** (graceful degradation)
3. **Queue for later** (best for writes)
4. **Fail fast with clear error** (be honest with user)
5. **Try alternate provider** (if available)

```javascript
// Example: Multiple fallback levels
async function getUserProfile(userId) {
    return circuit.execute(
        () => db.getUserProfile(userId),
        () => {
            // Fallback 1: Try cache
            const cached = cache.get(`user:${userId}`);
            if (cached) return cached;
            
            // Fallback 2: Return minimal profile
            return {
                id: userId,
                name: 'User',
                _partial: true
            };
        }
    );
}
```

### Monitoring

**Track circuit breaker state**:
```javascript
// Expose metrics endpoint
app.get('/admin/circuits', (req, res) => {
    res.json({
        database: dbCircuit.getState(),
        payment: paymentCircuit.getState(),
        email: emailCircuit.getState()
    });
});
```

**Alert on state changes**:
- Circuit opens → Page operations team
- Circuit stays open > 5 min → Escalate
- Circuit flapping (open/close cycles) → Configuration issue

### Remember This

- ✅ **Use circuit breaker for all external calls** (integrations, databases, APIs)
- ✅ **Provide fallback strategies** (don't just fail)
- ✅ **Monitor circuit state** (expose in health checks)
- ✅ **Tune thresholds per service** (critical = higher threshold)
- ✅ **Circuit breaker prevents cascading failures**

---

## Bulkheads

**Partition capacity to contain damage**

### Problem

Shared resources mean one problem affects everything:
```
Web servers → Database connection pool (shared)
One query hangs → Exhausts all connections
All operations fail → Complete outage
```

### Solution

Partition resources into isolated pools:
```
Critical ops → Pool A (10 connections)
Standard ops → Pool B (20 connections)
Reports      → Pool C (5 connections)

Report query hangs → Pool C exhausted
Critical ops still work → Partial outage, not total
```

**Named after ship bulkheads**: Compartmentalized so one breach doesn't sink the ship.

### Implementation Patterns

#### 1. Connection Pool Bulkheads

```javascript
// Separate pools for different priorities
const criticalPool = new Pool({
    max: 10,
    min: 2,
    ...config
});

const standardPool = new Pool({
    max: 20,
    min: 5,
    ...config
});

const analyticsPool = new Pool({
    max: 5,
    min: 1,
    ...config
});

// Route queries to appropriate pool
async function query(sql, priority = 'standard') {
    const pool = {
        'critical': criticalPool,
        'standard': standardPool,
        'analytics': analyticsPool
    }[priority];
    
    return pool.query(sql);
}
```

#### 2. Thread Pool Bulkheads

```javascript
// Separate thread pools for different workloads
const fastOperations = new ThreadPool({ size: 50 });
const slowOperations = new ThreadPool({ size: 10 });
const backgroundJobs = new ThreadPool({ size: 5 });

// Route work to appropriate pool
async function processRequest(req) {
    if (req.isFast) {
        return fastOperations.execute(() => handleFast(req));
    } else {
        return slowOperations.execute(() => handleSlow(req));
    }
}
```

#### 3. Service Instance Bulkheads

**Split cluster into partitions**:
```
Production cluster: 30 servers

Partition 1 (Critical customers): 10 servers
Partition 2 (Standard customers): 15 servers
Partition 3 (Free tier): 5 servers

Free tier abuse → Only partition 3 affected
Critical customers unaffected
```

#### 4. Process-Level Bulkheads

**Run separate processes**:
```
Process 1: API server (port 3000)
Process 2: Background jobs (no network)
Process 3: Report generation (separate port)

Report process crashes → API still running
Memory leak in jobs → Doesn't affect API
```

### Sizing Bulkheads

**Trade-off**: Isolation vs. efficiency

**Too many small bulkheads**:
- Maximum isolation
- Wasted capacity (idle resources)
- Complex management

**Too few large bulkheads**:
- Efficient resource use
- Less isolation
- More blast radius

**Guidelines**:
1. **Identify criticality levels** (2-4 levels typical)
2. **Allocate based on SLA** (stricter SLA = more resources)
3. **Monitor utilization** (should be 60-80% avg)
4. **Allow rebalancing** (manual or automatic)

### Remember This

- ✅ **Partition by criticality** (protect important operations)
- ✅ **Physical redundancy > logical** (separate processes/servers)
- ✅ **Size bulkheads by SLA requirements**
- ✅ **Monitor per-bulkhead utilization**
- ✅ **One failure doesn't sink the ship**

---

## Steady State

**Eliminate recurring human intervention**

### Problem

Systems that require regular maintenance:
- Daily log file cleanup
- Weekly database purge
- Monthly cache clear
- "Just restart it once a day"

**Result**: Operations burden, forgot to do it = outage

### Solution

Design systems to run indefinitely without human intervention.

### Patterns

#### 1. Data Purging

**Problem**: Unbounded growth
```sql
-- Table grows forever
CREATE TABLE audit_log (
    id SERIAL,
    event TEXT,
    created_at TIMESTAMP
);

-- After 1 year: 1 billion rows
-- Queries time out
-- Backup takes 12 hours
-- Out of disk space
```

**Solution**: Automatic purging
```javascript
// Daily cron job
cron.schedule('0 2 * * *', async () => {
    // Delete records older than 90 days
    await db.query(`
        DELETE FROM audit_log 
        WHERE created_at < NOW() - INTERVAL '90 days'
    `);
});
```

**Better**: Partition by time
```sql
-- Partitioned table (PostgreSQL)
CREATE TABLE audit_log (
    id BIGSERIAL,
    event TEXT,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
-- Drop old partitions (instant, no DELETE scan)
DROP TABLE audit_log_2023_01;
```

#### 2. Log File Rotation

**Problem**: Logs fill disk
```bash
# app.log grows to 50GB
# Out of disk space
# Application crashes
```

**Solution**: Rotate automatically
```javascript
// Using Winston logger
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: 'app.log',
            maxsize: 100 * 1024 * 1024,  // 100MB
            maxFiles: 10,                 // Keep 10 files
            tailable: true
        })
    ]
});
```

#### 3. In-Memory Cache Limits

**Problem**: Cache grows until OOM
```javascript
// Bad: Unbounded cache
const cache = new Map();
function get(key) {
    if (!cache.has(key)) {
        cache.set(key, expensiveComputation(key));
    }
    return cache.get(key);
}
// Eventually: Out of memory
```

**Solution**: LRU cache with size limit
```javascript
// Good: Bounded cache
const cache = new LRUCache({
    max: 1000,              // Max 1000 items
    maxSize: 50 * 1024 * 1024,  // Max 50MB
    sizeCalculation: (value) => {
        return Buffer.byteLength(JSON.stringify(value));
    },
    ttl: 1000 * 60 * 60     // 1 hour TTL
});
```

#### 4. Session Cleanup

**Problem**: Dead sessions accumulate
```javascript
// Sessions never cleaned up
// Memory grows forever
const sessions = new Map();

app.post('/login', (req, res) => {
    const sessionId = generateId();
    sessions.set(sessionId, { user: req.body.user });
    // Session never removed!
});
```

**Solution**: TTL-based cleanup
```javascript
// Using Redis with TTL
await redis.setex(
    `session:${sessionId}`,
    1800,  // 30 minute TTL
    JSON.stringify(sessionData)
);

// Or manual cleanup
setInterval(() => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastAccess > 30 * 60 * 1000) {
            sessions.delete(id);
        }
    }
}, 60000);  // Every minute
```

### Remember This

- ✅ **No data structure should grow without bounds**
- ✅ **Log files must rotate automatically**
- ✅ **Caches need size limits and TTLs**
- ✅ **Dead sessions must be cleaned up**
- ✅ **System should run indefinitely without human intervention**

---

## Fail Fast

**Verify resources early, don't waste time on doomed operations**

### Problem

Slow failures waste resources:
```
Request arrives
Allocate resources
Start processing
Check database connection (fails!)
Roll back work
Return error
Time wasted: 5 seconds
```

### Solution

Check for problems immediately:
```
Request arrives
Check database connection (fails!)
Return error immediately
Time wasted: 50ms
Resources saved: All of them
```

### Patterns

#### 1. Resource Verification

```javascript
// Bad: Check resources late
async function processOrder(order) {
    const validatedOrder = await validateOrder(order);
    const inventory = await checkInventory(order);
    const payment = await processPayment(order);  // Fails here!
    // Now must reverse inventory check
}

// Good: Check early
async function processOrder(order) {
    // Fail fast checks
    if (!paymentService.isAvailable()) {
        throw new Error('Payment service unavailable');
    }
    if (!inventoryService.isAvailable()) {
        throw new Error('Inventory service unavailable');
    }
    
    // Now proceed with confidence
    const validatedOrder = await validateOrder(order);
    const inventory = await checkInventory(order);
    const payment = await processPayment(order);
}
```

#### 2. Input Validation

```javascript
// Bad: Validate late
async function createUser(data) {
    const userId = generateId();
    await db.query('INSERT INTO users ...');
    await sendWelcomeEmail(data.email);
    // Only now check if email is valid!
    if (!isValidEmail(data.email)) {
        throw new Error('Invalid email');
        // Orphaned user record in database
    }
}

// Good: Validate immediately
async function createUser(data) {
    // Fail fast validation
    if (!isValidEmail(data.email)) {
        throw new Error('Invalid email');
    }
    if (!data.password || data.password.length < 8) {
        throw new Error('Password too short');
    }
    
    // Now proceed
    const userId = generateId();
    await db.query('INSERT INTO users ...');
    await sendWelcomeEmail(data.email);
}
```

#### 3. Circuit Breaker Integration

```javascript
// Check circuit breaker before expensive operations
async function fetchUserData(userId) {
    // Fail fast: Don't even try if circuit is open
    if (dbCircuit.state === 'OPEN') {
        throw new Error('Database temporarily unavailable');
    }
    
    return dbCircuit.execute(() => db.getUser(userId));
}
```

#### 4. Startup Validation

```javascript
// Verify configuration and resources at startup
async function startServer() {
    console.log('Starting server...');
    
    // Fail fast: Check critical resources
    try {
        await db.ping();
    } catch (error) {
        console.error('Cannot connect to database');
        process.exit(1);  // Don't start if DB unavailable
    }
    
    try {
        await redis.ping();
    } catch (error) {
        console.error('Cannot connect to Redis');
        process.exit(1);
    }
    
    // Verify configuration
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY not configured');
        process.exit(1);
    }
    
    // All checks passed, start server
    app.listen(PORT);
    console.log(`Server started on port ${PORT}`);
}
```

### Remember This

- ✅ **Check resource availability immediately**
- ✅ **Validate input before doing work**
- ✅ **Fail at startup if config is wrong** (don't wait for first request)
- ✅ **Fast failure is better than slow failure**
- ✅ **Save resources for requests that can succeed**

---

## Let It Crash

**Embrace failure at component level for system stability**

### Problem

Trying to handle every possible error:
```javascript
try {
    result = operation1();
    try {
        result2 = operation2(result);
        try {
            result3 = operation3(result2);
            // Nested try-catch hell
        } catch (e3) { /* ... */ }
    } catch (e2) { /* ... */ }
} catch (e1) { /* ... */ }
```

**Issues**:
- Can't anticipate all errors
- Defensive code becomes unmaintainable
- Partial failures create inconsistent state

### Solution

Let components crash, supervise their restart:

**Erlang philosophy**:
1. **Crash component** when unexpected error occurs
2. **Supervisor** detects crash
3. **Restart** component in known-good state
4. **System continues** with functioning components

### Patterns

#### 1. Process Supervision

```javascript
// Supervisor restarts crashed workers
class Supervisor {
    constructor(workerFactory, options = {}) {
        this.workerFactory = workerFactory;
        this.maxRestarts = options.maxRestarts || 5;
        this.restartWindow = options.restartWindow || 60000;
        this.restarts = [];
        this.worker = null;
    }
    
    async start() {
        this.worker = await this.workerFactory();
        
        this.worker.on('error', (error) => {
            console.error('Worker crashed:', error);
            this.handleCrash();
        });
    }
    
    async handleCrash() {
        const now = Date.now();
        this.restarts.push(now);
        
        // Clean old restart records
        this.restarts = this.restarts.filter(
            t => now - t < this.restartWindow
        );
        
        // Too many restarts?
        if (this.restarts.length > this.maxRestarts) {
            console.error('Worker crashing too frequently, giving up');
            process.exit(1);
        }
        
        // Restart worker
        console.log('Restarting worker...');
        await this.start();
    }
}

// Usage
const supervisor = new Supervisor(
    () => new Worker(),
    { maxRestarts: 5, restartWindow: 60000 }
);
await supervisor.start();
```

#### 2. Stateless Components

**Key**: Components must not hold critical state
```javascript
// Bad: State lost on crash
class OrderProcessor {
    constructor() {
        this.pendingOrders = [];  // Lost if process crashes!
    }
}

// Good: State externalized
class OrderProcessor {
    constructor(db) {
        this.db = db;  // State in database, survives crashes
    }
    
    async processNextOrder() {
        const order = await this.db.getNextPendingOrder();
        // Process order
        // If crash occurs, order still in database
    }
}
```

#### 3. Idempotent Operations

**Restarted operations shouldn't cause problems**:
```javascript
// Bad: Not idempotent
async function chargeCustomer(orderId) {
    await stripe.charges.create({
        amount: getOrderTotal(orderId),
        customer: getCustomerId(orderId)
    });
    // If crashes before marking complete, charges twice!
}

// Good: Idempotent
async function chargeCustomer(orderId) {
    const order = await db.getOrder(orderId);
    if (order.charged) {
        return;  // Already done
    }
    
    await stripe.charges.create({
        amount: order.total,
        customer: order.customerId,
        idempotency_key: orderId  // Stripe won't charge twice
    });
    
    await db.markOrderCharged(orderId);
}
```

#### 4. Fast Replacement

**Restart should be quick**:
```javascript
// Slow: Load entire dataset on startup
class DataService {
    async start() {
        this.data = await db.loadAllData();  // 30 seconds!
        // Restart takes 30 seconds
    }
}

// Fast: Lazy loading
class DataService {
    async start() {
        // Ready immediately
    }
    
    async getData(key) {
        return this.cache.get(key) || await db.load(key);
        // Load on demand
    }
}
```

### Remember This

- ✅ **Don't try to catch everything** (let unexpected errors crash)
- ✅ **Supervise and restart** crashed components
- ✅ **Externalize state** (don't keep in memory)
- ✅ **Make operations idempotent** (safe to retry)
- ✅ **Fast restart** is critical (minimize downtime)

---

## Handshaking

**Cooperative demand control**

### Problem

Caller doesn't know if provider can handle load:
```
Caller → Sends 1000 req/sec
Provider → Can only handle 100 req/sec
Result → 900 requests fail
```

### Solution

Provider signals capacity to caller:
```
Provider → Sends "slow down" signal
Caller → Reduces request rate
Result → 100 requests succeed, 0 fail
```

### Patterns

#### 1. Health Checks

```javascript
// Provider exposes health endpoint
app.get('/health', (req, res) => {
    const health = {
        status: 'healthy',
        load: getCurrentLoad(),  // 0.0 to 1.0
        capacity: getAvailableCapacity()
    };
    
    if (health.load > 0.9) {
        health.status = 'degraded';
        res.status(503);
    }
    
    res.json(health);
});

// Caller checks health before sending requests
async function makeRequest() {
    const health = await getHealth();
    if (health.status !== 'healthy') {
        // Back off or use circuit breaker
        throw new Error('Service degraded');
    }
    
    return actualRequest();
}
```

#### 2. HTTP Status Codes

**429 Too Many Requests**:
```javascript
// Provider returns 429 when overloaded
if (getCurrentLoad() > MAX_LOAD) {
    res.status(429)
       .header('Retry-After', '60')  // Try again in 60 sec
       .json({ error: 'Too many requests' });
    return;
}

// Caller respects 429
async function callAPI() {
    const response = await fetch(url);
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        await sleep(retryAfter * 1000);
        return callAPI();  // Retry after delay
    }
    return response;
}
```

**503 Service Unavailable**:
```javascript
// Provider signals temporary unavailability
if (!canProcessRequests()) {
    res.status(503)
       .header('Retry-After', '30')
       .json({ error: 'Service temporarily unavailable' });
    return;
}
```

#### 3. Load Shedding Signals

```javascript
// Provider includes load information in response
res.set('X-Load-Factor', currentLoad);  // 0.0 to 1.0

// Caller adjusts behavior based on load
const loadFactor = response.headers.get('X-Load-Factor');
if (loadFactor > 0.8) {
    // Reduce request rate
    await sleep(1000);
}
```

### Remember This

- ✅ **Provider signals capacity** (health checks, status codes)
- ✅ **Caller respects signals** (backs off when asked)
- ✅ **Use standard HTTP codes** (429, 503)
- ✅ **Include Retry-After** headers
- ✅ **Cooperative demand control** prevents overload

---

## Shed Load

**Refuse work when at capacity**

### Problem

Accepting more work than you can handle:
```
Capacity: 100 req/sec
Incoming: 200 req/sec
Result: All requests slow, many timeout, none get good service
```

### Solution

Refuse excess work to protect what you can handle:
```
Capacity: 100 req/sec
Incoming: 200 req/sec
Accept: 100 req/sec (good service)
Reject: 100 req/sec (fast failure)
Result: 100 requests succeed quickly
```

### Patterns

#### 1. Request Queue Limits

```javascript
const queue = [];
const MAX_QUEUE_SIZE = 100;

app.use((req, res, next) => {
    if (queue.length >= MAX_QUEUE_SIZE) {
        res.status(503).json({
            error: 'Server overloaded, try again later'
        });
        return;
    }
    
    queue.push(req);
    next();
});
```

#### 2. Load-Based Rejection

```javascript
app.use((req, res, next) => {
    const load = os.loadavg()[0];  // 1-minute load average
    const cpus = os.cpus().length;
    
    if (load / cpus > 0.9) {  // > 90% CPU
        res.status(503).json({
            error: 'Server overloaded'
        });
        return;
    }
    
    next();
});
```

#### 3. Priority-Based Shedding

```javascript
// Shed low-priority requests first
app.use((req, res, next) => {
    if (isOverloaded()) {
        const priority = req.headers['x-priority'] || 'normal';
        
        if (priority === 'low') {
            res.status(503).json({
                error: 'Server overloaded, low priority requests rejected'
            });
            return;
        }
    }
    
    next();
});
```

#### 4. Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
    windowMs: 60 * 1000,  // 1 minute
    max: 100,              // 100 requests per minute
    message: 'Too many requests'
});

app.use('/api/', limiter);
```

### Remember This

- ✅ **Better to refuse work than fail at all work**
- ✅ **Fail fast for rejected requests** (don't waste time)
- ✅ **Shed low-priority first** (protect critical operations)
- ✅ **Use rate limiting** (per-user, per-IP)
- ✅ **Load shedding prevents total collapse**

---

## Back Pressure

**Push back against demand**

### Problem

Producer overwhelms consumer:
```
Producer → 1000 messages/sec
Consumer → Processes 100 messages/sec
Queue → Grows indefinitely
Result → Out of memory
```

### Solution

Consumer signals producer to slow down:
```
Queue reaches limit → Consumer signals "slow down"
Producer → Reduces rate
Queue → Stabilizes
```

### Patterns

#### 1. Bounded Queues

```javascript
// Bad: Unbounded queue
const queue = [];
producer.on('data', (item) => {
    queue.push(item);  // Queue grows forever
});

// Good: Bounded queue
const queue = [];
const MAX_SIZE = 1000;

producer.on('data', (item) => {
    if (queue.length >= MAX_SIZE) {
        producer.pause();  // Signal: slow down!
        return;
    }
    queue.push(item);
});

// Resume when queue drains
setInterval(() => {
    if (queue.length < MAX_SIZE * 0.5) {
        producer.resume();
    }
}, 1000);
```

#### 2. TCP Flow Control

**Built into TCP**:
```
Receiver has buffer of size N
Buffer fills up
Receiver sends "window size = 0" to sender
Sender stops sending
Buffer drains
Receiver sends "window size = N"
Sender resumes
```

**Lesson**: Design application-level flow control similarly.

#### 3. Async Iterators with Back Pressure

```javascript
// Node.js streams have built-in back pressure
const stream = fs.createReadStream('large-file.txt');

stream.on('data', async (chunk) => {
    stream.pause();  // Stop reading
    
    await processChunk(chunk);  // Slow operation
    
    stream.resume();  // Resume reading
});
```

#### 4. Message Queue Back Pressure

```javascript
// RabbitMQ prefetch (back pressure)
channel.prefetch(10);  // Only send 10 messages at a time

// Consumer processes messages
channel.consume('queue', async (msg) => {
    await processMessage(msg);
    channel.ack(msg);  // Signal: ready for next
});

// If consumer is slow, queue doesn't send more than 10
```

### Remember This

- ✅ **Use bounded queues** (never unlimited)
- ✅ **Consumer controls flow** (not producer)
- ✅ **Signal producer to slow down** (pause/resume)
- ✅ **TCP has flow control** (learn from it)
- ✅ **Back pressure prevents queue explosion**

---

## Governor

**Limit rate of actions**

### Problem

Runaway automation amplifies problems:
```
Autoscaler sees high load
Scales from 10 → 100 instances in 10 seconds
All 100 instances boot simultaneously
All 100 hit database to initialize
Database melts
All 100 instances crash
Autoscaler scales to 200
Death spiral
```

### Solution

Limit rate of change:
```
Autoscaler sees high load
Scales 10 → 12 instances (max +20% per minute)
Wait 60 seconds
Check again, scale 12 → 14
Gradual, controlled scaling
```

### Patterns

#### 1. Rate Limiting Actions

```javascript
class Governor {
    constructor(maxActionsPerPeriod, periodMs) {
        this.maxActions = maxActionsPerPeriod;
        this.period = periodMs;
        this.actions = [];
    }
    
    canPerformAction() {
        const now = Date.now();
        this.actions = this.actions.filter(
            t => now - t < this.period
        );
        
        return this.actions.length < this.maxActions;
    }
    
    recordAction() {
        this.actions.push(Date.now());
    }
    
    async performAction(action) {
        if (!this.canPerformAction()) {
            throw new Error('Rate limit exceeded');
        }
        
        this.recordAction();
        return action();
    }
}

// Usage
const scaleGovernor = new Governor(5, 60000);  // Max 5 scales per minute

async function scaleUp() {
    await scaleGovernor.performAction(async () => {
        console.log('Scaling up...');
        await cloud.createInstance();
    });
}
```

#### 2. Exponential Rate Limiting

```javascript
// Progressively stricter limits during problems
class AdaptiveGovernor {
    constructor() {
        this.consecutiveFailures = 0;
        this.baseRate = 10;  // Actions per minute
    }
    
    getCurrentLimit() {
        // Reduce limit exponentially with failures
        return Math.max(
            1,
            this.baseRate / Math.pow(2, this.consecutiveFailures)
        );
    }
    
    onSuccess() {
        this.consecutiveFailures = Math.max(0, this.consecutiveFailures - 1);
    }
    
    onFailure() {
        this.consecutiveFailures++;
    }
}
```

#### 3. Deployment Rate Limiting

```javascript
// Limit how fast new code can roll out
const deployGovernor = new Governor(1, 5 * 60 * 1000);  // 1 deploy per 5 min

async function deploy(version) {
    await deployGovernor.performAction(async () => {
        console.log(`Deploying ${version}...`);
        
        // Deploy to 10% of servers
        await deployToCanary(version);
        
        // Wait for health checks
        await sleep(60000);
        
        // If healthy, deploy to rest
        if (isHealthy()) {
            await deployToAll(version);
        } else {
            await rollback(version);
        }
    });
}
```

### Remember This

- ✅ **Limit rate of dangerous actions** (scaling, deployments, retries)
- ✅ **Automation amplifies errors** (governor prevents amplification)
- ✅ **Use exponential backoff** during problems
- ✅ **Gradual change is safer** than rapid change
- ✅ **Governor prevents death spirals**

---

## Pattern Summary Table

| Pattern | Purpose | Key Benefit |
|---------|---------|-------------|
| **Timeouts** | Prevent indefinite blocking | Resources freed quickly |
| **Circuit Breaker** | Stop calling failing service | Prevents cascading failures |
| **Bulkheads** | Partition capacity | Contain damage, partial functionality |
| **Steady State** | Eliminate manual intervention | System runs indefinitely |
| **Fail Fast** | Verify resources early | Don't waste time on doomed operations |
| **Let It Crash** | Embrace component failure | System-level stability |
| **Handshaking** | Cooperative demand control | Prevent overload |
| **Shed Load** | Refuse excess work | Protect capacity for what you can handle |
| **Back Pressure** | Consumer controls flow | Prevent queue explosion |
| **Governor** | Limit rate of actions | Prevent automation amplification |

---

## Combining Patterns

**Patterns work together**:

```javascript
// Integration point protected by multiple patterns

// 1. Circuit breaker
const apiCircuit = new CircuitBreaker({ /* ... */ });

// 2. Timeout
const TIMEOUT = 5000;

// 3. Bulkhead (separate connection pool)
const apiPool = new ConnectionPool({ max: 10 });

// 4. Governor (rate limiting)
const apiGovernor = new Governor(100, 60000);

async function callExternalAPI(request) {
    // Check governor
    await apiGovernor.performAction(async () => {
        // Use circuit breaker
        return apiCircuit.execute(async () => {
            // Get connection from bulkhead
            const conn = await apiPool.getConnection();
            try {
                // Apply timeout
                return await withTimeout(
                    conn.request(request),
                    TIMEOUT
                );
            } finally {
                conn.release();
            }
        });
    });
}
```

---

## Next Steps

- Review [ANTIPATTERNS.md](./ANTIPATTERNS.md) to understand what these patterns prevent
- See [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) for deployment considerations
- Study [CHAOS-ENGINEERING.md](./CHAOS-ENGINEERING.md) for testing these patterns

