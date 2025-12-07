# Stability Antipatterns

> Reference guide from "Release It!" - Common failure modes that kill production systems

## Overview

Antipatterns are common forces that create, accelerate, or multiply cracks in systems. These bad behaviors lead to cascading failures, chain reactions, and complete outages. Understanding them is the first step to preventing them.

**Key Principle**: *Faults will happen. They cannot be completely prevented. We must keep faults from becoming errors, and errors from becoming failures.*

---

## Chain of Failure Terminology

- **Fault**: A condition that creates incorrect internal state (e.g., a bug gets triggered, a null check is missing)
- **Error**: Visibly incorrect behavior (e.g., wrong calculation, corrupted data)
- **Failure**: Unresponsive system (e.g., server doesn't respond to requests)

**Progression**: Fault → Error → Failure

At each step, cracks can accelerate, slow, or stop. Tight coupling accelerates cracks. Loose coupling acts as shock absorbers.

---

## Integration Points

**The #1 Killer of Systems**

### Description

Every integration point—socket connection, HTTP call, database query, message queue, vendor API—is a risk. These connections can hang, crash, or generate failures at the worst possible time.

### Common Failure Modes

#### 1. Socket-Based Protocol Failures

**Fast Failures** (easy to handle):
- Connection refused (port closed)
- Network unreachable
- DNS lookup failure

**Slow Failures** (dangerous):
- Connection accepted but never responds
- Request sent but no response (blocked forever)
- Firewall drops packets silently (no TCP reset)
- Connection in listen queue limbo (can block for minutes)

#### 2. The Firewall Timeout Problem ("5 AM Problem")

**Scenario**: Connection established and working, but idle for too long.

**What happens**:
1. Application server opens connection to database
2. Connection goes idle (no traffic for 1+ hour)
3. Firewall silently drops connection from its state table
4. Application tries to use "dead" connection
5. Write/read blocks waiting for ACK that will never come
6. Thread blocks for 10-30 minutes (depending on OS TCP retry settings)

**Real-world example**:
```
2:30 AM - Low traffic, one DB connection handles all requests
3:30 AM - Connection has been idle for 1 hour
3:30 AM - Firewall drops idle connection
5:30 AM - Traffic ramps up, app tries to use 39 "dead" connections
5:31 AM - All request threads blocked waiting on dead connections
5:31 AM - Site completely down
```

**Solution**: TCP keepalive packets to reset firewall's "last packet" timer.

#### 3. HTTP Protocol Issues

Beyond socket problems, HTTP adds its own:
- Unexpected response codes (451 Resource Censored, 418 I'm a Teapot)
- Wrong content type (HTML error page when expecting JSON)
- Malformed responses (says JSON but sends plain text)
- Provider sends binary data when expecting text
- Compression/encoding mismatches

#### 4. Vendor API Library Problems

**Common issues**:
- No timeout configuration
- Blocking operations hidden behind async-looking APIs
- Resource pools that deadlock
- Callback threading nightmares
- Silent failures that don't throw exceptions

**Example**: Callback deadlock
```javascript
// UserCallback.messageReceived() is synchronized
// Library holds lock A, calls your callback
// Your callback tries to call library.send()
// library.send() needs lock A
// DEADLOCK
```

### Prevention

**Essential protections**:
1. **Always use timeouts** - Never let a call block forever
2. **Circuit breaker** - Stop calling failing services
3. **Test harness** - Simulate network failures in testing
4. **Know your abstractions** - Understand what's happening at the socket level
5. **Bulkheads** - Isolate integration points so one failure doesn't cascade

### Remember This

- ⚠️ **Every integration point will eventually fail**
- ⚠️ **Prepare for many forms of failure** (not just clean error responses)
- ⚠️ **Know when to peel back abstractions** (debugging requires looking at packets)
- ⚠️ **Failures propagate quickly** (remote problem becomes your problem)
- ✅ **Apply patterns**: Circuit Breaker, Timeouts, Decoupling Middleware, Handshaking

---

## Chain Reactions

**When one failure triggers the next**

### Description

In horizontally scaled farms (clusters of identical servers), the failure of one node increases load on survivors. If the failure was load-related, survivors become more likely to fail.

### Mechanism

**Normal state** (8-server cluster):
- Each server handles 12.5% of load
- All healthy and stable

**After one failure**:
- 7 servers remain
- Each now handles 14.3% of load
- That's a 15% increase per server (1.8% of total)

**If failure was load-related**:
- Resource leak, memory pressure, race condition
- Survivors experience same pressure, accelerated
- Next failure more likely
- Each failure accelerates the next

**Degenerate case** (2-node cluster):
- One fails
- Survivor's load doubles
- Almost guaranteed to fail immediately

### Real-World Example: Search Engine Memory Leak

```
12:00 PM - All 12 search engines healthy
12:05 PM - First engine crashes (memory leak)
12:11 PM - Second crashes (6 min gap)
12:15 PM - Third crashes (4 min gap)
12:17 PM - Fourth crashes (2 min gap)
12:18 PM - Fifth & sixth crash (1 min gap)
12:18 PM - Remaining six crash within seconds
12:18 PM - Complete outage
```

**Pattern**: Exponentially accelerating failures as remaining servers take more load.

### Prevention

**Primary defenses**:
1. **Hunt for resource leaks** - Memory leaks are the #1 cause
2. **Hunt for timing bugs** - Race conditions triggered by load
3. **Autoscaling** - Replace failed instances faster than chain propagates
4. **Bulkheads** - Split into multiple independent pools
5. **Circuit breaker on callers** - Protect upstream systems

### Remember This

- ⚠️ **One server down jeopardizes the rest** (load redistribution)
- ⚠️ **Resource leaks cause chain reactions** (memory most common)
- ⚠️ **Obscure timing bugs appear under load**
- ✅ **Use autoscaling** to replace faster than chain propagates
- ✅ **Defend with bulkheads** to limit blast radius

---

## Cascading Failures

**When cracks jump layers**

### Description

A cascading failure occurs when a problem in one layer triggers failures in calling layers. The failure "jumps the gap" through the system's architecture.

**Key difference from chain reaction**:
- **Chain reaction**: Horizontal spread (within a layer)
- **Cascading failure**: Vertical spread (across layers)

### Layer-Jumping Mechanisms

#### 1. Resource Pool Exhaustion

**Most common mechanism**:
```
Database slows down
  ↓
Connection pool exhausts (all connections in use)
  ↓
Request threads block waiting for connections
  ↓
All request threads blocked
  ↓
Application server stops responding
  ↓
Load balancer redirects to other app servers
  ↓
They exhaust their pools too
  ↓
Complete outage
```

#### 2. Integration Points Without Timeouts

The "grounded airline" scenario:
```
Database failover occurs
  ↓
Existing JDBC connections become invalid
  ↓
Statement.close() throws SQLException
  ↓
Connection.close() never called (in finally block after exception)
  ↓
Connection leaked from pool
  ↓
After 40 leaks, pool exhausted
  ↓
All future requests block on connectionPool.getConnection()
  ↓
All calling systems hang
```

#### 3. Blocked Threads

**Without timeouts**:
- Caller makes RMI/HTTP call
- Provider stops responding
- Caller thread blocks forever
- All caller's threads eventually blocked
- Caller fails

**With aggressive retry**:
- Provider returns error quickly
- Caller assumes "transient error" and retries
- More errors = more retries
- Caller uses 100% CPU hammering failing provider
- Both systems down

#### 4. Speculative Retries

- Provider slows down (but doesn't fail)
- Caller fires speculative retries ("try another server")
- More load on already-struggling provider
- Provider gets slower
- More retries
- Death spiral

### Prevention

**Stop cracks from jumping**:
1. **Timeouts on all calls** - Never block forever
2. **Circuit breaker** - Stop calling when provider is failing
3. **Bulkheads** - Isolate pools by priority/criticality
4. **Limit retries** - Exponential backoff with max attempts
5. **Don't use speculative retries** on struggling services

### Remember This

- ⚠️ **Stop cracks from jumping the gap** (integration points are the jump points)
- ⚠️ **Scrutinize resource pools** (must have time limits on blocking)
- ⚠️ **Cascading failure requires a prior failure** (something already went wrong)
- ✅ **Defend with Timeouts and Circuit Breaker**
- ✅ **Resource pools must limit blocking time**

---

## Users

**"A terrible thing"**

### Description

Users—both human and automated—present numerous stability risks. They do creative, unexpected, expensive, and sometimes malicious things.

### Traffic

**The inevitable growth problem**:
- Traffic will eventually exceed capacity
- When it does, how does your system react?
- Does it degrade gracefully or collapse completely?

#### Memory from Sessions

**The session problem**:
```
User makes request → Session created (memory allocated)
User makes last request → Session sits in memory for timeout period
Session timeout (typically 30 min) → Session finally released
```

**Dead time**: Session occupies memory doing nothing.

**Under load**:
- 10,000 active users
- 30-minute timeout
- Average session size: 10KB
- Memory usage: 100MB just in sessions
- Many users never come back (closed browser, navigated away)
- Their sessions are "memory zombies"

#### Socket Exhaustion

**Port limits**:
- 16-bit port number = 65,535 max
- IANA recommended ephemeral range: 49152-65535 = 16,383 ports
- Each active request = one open socket
- Theoretical limit: ~16,000 concurrent connections per IP

**For millions of connections**:
- Need multiple IP addresses bound to NIC
- Each IP gets its own port range
- 1M connections ≈ 16 IP addresses needed

#### Closed Socket Problems (TIME_WAIT)

**What is TIME_WAIT?**:
- After closing socket, OS holds it in TIME_WAIT state
- Prevents "bogons" (late-arriving packets) from corrupting new connections
- Default: 60-120 seconds before socket can be reused

**Under high load**:
- Releasing 1000 req/sec
- TIME_WAIT = 60 sec
- 60,000 sockets in TIME_WAIT at any time
- Can exhaust available ports

**Solution**: Reduce TIME_WAIT in data center (bogons rare internally).

### Expensive to Serve

**Not all users are equal**:
- Browsers: Cheap (cached content, few pages)
- Buyers: Expensive (checkout flow, credit card calls, inventory checks, emails)

**The irony**: Most expensive users generate revenue!

**Impact**:
- Increased conversion rate = more stress
- More external integration calls
- More database writes
- More risk of triggering integration point failures

**Strategy**:
- Load test with elevated expensive transaction ratio
- If normal = 2% conversion, test with 4-10%
- Don't test 100% expensive (unrealistic, over-provision)

### Unwanted Users

#### Accidental Bad Users

**Misconfigured proxies**:
```
User makes last legitimate request
15 minutes later: Proxy starts repeating last URL
Frequency: Every 30 seconds
Then: Accelerating to 5 requests/second
Each request: New session (no session cookie sent)
Result: Session flood
```

#### Malicious Users

**Screen scrapers**:
- Competitive intelligence services
- Ignore robots.txt
- Don't honor session cookies
- Each request creates new session
- Can generate 100,000+ sessions

**Attack vector**:
```
Pick deep link
Request without cookies
Drop connection immediately (don't wait for response)
Repeat thousands of times
```

**Result**:
- Server creates session
- Processes entire request
- Sends response to closed connection
- Memory exhaustion
- Server death

**DDoS amplification**:
- Small request (100 bytes)
- Large session (10KB+)
- 100:1 amplification
- Desktop on broadband can kill major site

### Prevention

**Traffic management**:
1. **Limit session memory** - Use weak references, off-heap storage
2. **Session timeout tuning** - Shorter for public, longer for authenticated
3. **Bot detection** - Rate limiting, CAPTCHA, behavioral analysis
4. **Connection limits per IP** - Prevent single-source floods
5. **Aggressive load testing** - Test beyond expected traffic patterns

**Memory management**:
1. **Keep minimal data in sessions**
2. **Use weak references** for large objects
3. **Consider off-heap storage** (Redis, Memcached)
4. **Don't cache search results** in session for pagination

**Socket management**:
1. **Tune TIME_WAIT** in data center
2. **Consider multiple IPs** for extreme scale
3. **Monitor socket usage** in production

### Remember This

- ⚠️ **Sessions are memory killers** (especially with high traffic)
- ⚠️ **Expensive users increase failure risk** (more integration points)
- ⚠️ **Unwanted users can kill systems** (intentionally or not)
- ✅ **Load test with elevated expensive transactions**
- ✅ **Minimize session data** (or move off-heap)
- ✅ **Implement rate limiting and bot detection**

---

## Blocked Threads

**The silent killer**

### Description

When request-handling threads block indefinitely, capacity decreases. If all threads block, the system appears down.

### Common Causes

#### 1. Resource Pool Exhaustion

**The "grounded airline" pattern**:
```java
Connection conn = null;
try {
    conn = pool.getConnection();  // Might block forever
    // ... use connection ...
} finally {
    if (conn != null) {
        conn.close();  // Can throw exception!
    }
}
```

**Failure mode**:
- `conn.close()` throws exception
- `finally` block exits
- Connection never returned to pool
- Pool slowly exhausts
- Future calls to `getConnection()` block forever

#### 2. Integration Points Without Timeouts

**RMI default behavior**:
- No timeout on socket reads
- Will block forever waiting for response
- Request thread stuck

**HTTP without timeout**:
- Many libraries default to no timeout
- Thread blocks indefinitely
- Capacity decreases with each blocked thread

#### 3. Deadlocks

**Classic deadlock**:
```
Thread 1: Holds lock A, needs lock B
Thread 2: Holds lock B, needs lock A
Result: Both blocked forever
```

**Hidden deadlock** (vendor libraries):
```
Library callback runs in synchronized context
Callback tries to call back into library
Library method is also synchronized
Deadlock
```

#### 4. Database Locks

- Long-running transactions
- Lock escalation (row → page → table)
- Distributed deadlock (multiple databases)
- Blocking on same-row updates

### Prevention

**Never block forever**:
1. **Use timeouts everywhere** - Sockets, HTTP, RMI, database queries
2. **Limit resource pool blocking** - `getConnection(timeout)`
3. **Async patterns** - Don't tie request threads to external calls
4. **Circuit breaker** - Stop trying when provider is down
5. **Bulkheads** - Isolate thread pools by purpose

**Resource pool safety**:
```java
Connection conn = null;
try {
    conn = pool.getConnection(5000);  // 5 sec timeout
    // ... use connection ...
} finally {
    if (conn != null) {
        try {
            conn.close();
        } catch (Exception e) {
            log.error("Failed to close connection", e);
            // Don't rethrow - connection is marked bad anyway
        }
    }
}
```

### Remember This

- ⚠️ **Blocked threads decrease capacity** (eventually to zero)
- ⚠️ **All blocking calls need timeouts** (never wait forever)
- ⚠️ **Resource pools must handle cleanup exceptions** (or leak resources)
- ⚠️ **Vendor libraries often have blocking bugs**
- ✅ **Use timeouts on all I/O operations**
- ✅ **Async patterns** decouple request handling from external calls

---

## Self-Denial Attacks

**When marketing kills engineering**

### Description

Your own system becomes the source of load that takes it down. Unlike external DDoS, these are self-inflicted.

### Common Scenarios

#### 1. Marketing Campaign Surprise

```
Monday: Engineering capacity planning shows comfortable headroom
Tuesday: Marketing launches "50% off!" email to 10 million customers
Tuesday + 1 hour: Site completely down
```

**The problem**: No coordination between marketing and engineering.

#### 2. Deep Links in Emails

**Innocent-looking email**:
```html
<a href="https://example.com/products/detail/12345">
  Check out this amazing deal!
</a>
```

**What happens**:
- Link bypasses normal entry pages
- Direct hit on expensive operation (database lookup)
- No caching on detail pages
- 10 million people click simultaneously
- Database melts

**Better approach**:
```html
<a href="https://example.com/landing/promo-2024-q1">
  Check out this amazing deal!
</a>
```

- Landing page is static (cached)
- Can handle unlimited traffic
- Funnels users through controlled path

#### 3. Shared Resource Contention

**Scenario**: Multiple services share authentication server
```
Normal: 1000 logins/min across all services
Campaign: 50,000 logins/min from one service
Result: Auth server overloaded
Impact: ALL services can't authenticate users
```

### Prevention

**Organizational**:
1. **Marketing/Engineering coordination** - Advance notice of campaigns
2. **Load testing for campaigns** - Simulate email blast
3. **Capacity planning reviews** - Before major launches

**Technical**:
1. **Rate limiting** - Protect shared resources
2. **Bulkheads** - Isolate campaign traffic
3. **Static landing pages** - Cache everything possible
4. **Circuit breaker** - Prevent overload propagation
5. **Shed load gracefully** - Degrade features, don't collapse

**Process**:
1. **Campaign pre-approval** - Engineering veto power
2. **Rollout schedule** - Stagger email sends
3. **Monitoring dashboards** - Real-time campaign impact

### Remember This

- ⚠️ **Marketing can generate massive load spikes** (50x-100x normal)
- ⚠️ **Deep links bypass caching** (hit expensive operations directly)
- ⚠️ **Shared resources amplify impact** (one service's campaign affects all)
- ✅ **Require marketing/engineering coordination**
- ✅ **Use static landing pages** for campaigns
- ✅ **Implement rate limiting and shed load**

---

## Scaling Effects

**What works for 10 users fails at 10,000**

### Description

Some architectural decisions work fine at small scale but create quadratic or exponential resource consumption at large scale.

### Common Patterns

#### 1. Point-to-Point Communication

**Cluster with 3 nodes**:
- Connections needed: 3 × 2 = 6
- Manageable

**Cluster with 100 nodes**:
- Connections needed: 100 × 99 = 9,900
- Each node maintains 99 connections
- Network traffic: O(n²)
- Catastrophic

**Better**: Hub-and-spoke or pub/sub pattern (O(n))

#### 2. Shared Resources

**Small scale**:
- 5 services sharing one config server
- 50 requests/min total
- No problem

**Large scale**:
- 500 services sharing one config server
- 50,000 requests/min total
- Config server melts
- All services fail to start

**Solution**: Replicate shared resources, cache aggressively

#### 3. Data Volume Growth

**Year 1**: Queries scan 1M rows, takes 100ms
**Year 5**: Same queries scan 50M rows, takes 30 seconds

**Solutions**:
- Pagination
- Archival strategies
- Partitioning
- Time-based indexes

### Prevention

**Design for scale**:
1. **Favor hub-and-spoke** over point-to-point
2. **Use pub/sub** for broadcast communication
3. **Replicate shared resources**
4. **Plan for data growth** from day one
5. **Load test at 10x expected scale**

### Remember This

- ⚠️ **Point-to-point = O(n²)** connection growth
- ⚠️ **Shared resources become bottlenecks** at scale
- ⚠️ **Data volume grows faster than traffic** (queries get slower)
- ✅ **Design for 10x current scale**
- ✅ **Replicate shared resources**
- ✅ **Plan for data archival** from start

---

## Unbalanced Capacities

**When tiers don't match**

### Description

Different layers of the system have different capacities. When one layer can drive more load than another can handle, failures occur.

### Common Mismatches

#### 1. Front-End Can Overload Back-End

**Scenario**:
```
Front-end: 100 servers, 10,000 req/sec capacity
Back-end: 10 servers, 2,000 req/sec capacity
Result: Front-end can easily kill back-end
```

**Real example**: Black Friday sale
- Marketing expects 10x traffic
- Scales up web servers
- Forgets to scale database
- Database falls over
- Web servers just show errors faster

#### 2. API Rate Limiting

**External API with limits**:
```
Your capacity: 100,000 req/min
Their rate limit: 10,000 req/min
Result: 90% of your requests fail
```

**Impact**: Your users see failures, blame you.

#### 3. Unexpected Load Patterns

**Normal**:
```
100 users
Each creates 1 session
100 database connections needed
```

**Campaign**:
```
10,000 users
Each creates 1 session
10,000 database connections needed
But: Connection pool max = 200
Result: 9,800 users see errors
```

### Prevention

**Capacity planning**:
1. **Load test entire stack** - Not just web tier
2. **Find bottlenecks** before production
3. **Balance capacity** across all tiers
4. **Plan for 10x growth** in each tier

**Runtime protection**:
1. **Rate limiting** - Protect downstream
2. **Circuit breaker** - Stop when downstream overloaded
3. **Bulkheads** - Isolate critical from non-critical
4. **Shed load** - Graceful degradation

**Monitoring**:
1. **Capacity metrics per tier** - Real-time visibility
2. **Alerts on imbalance** - Catch before outage
3. **Load test regularly** - Verify capacity changes

### Remember This

- ⚠️ **One tier can overload another** (capacity mismatch)
- ⚠️ **External APIs have rate limits** (must respect them)
- ⚠️ **Load testing must include all tiers** (end-to-end)
- ✅ **Balance capacity across stack**
- ✅ **Protect downstream with rate limiting**
- ✅ **Monitor capacity per tier**

---

## Slow Responses

**Worse than no response**

### Description

A slow response ties up resources longer than a fast failure. This makes slow responses more damaging than outright failures.

### Why Slow Is Worse

**Fast failure** (connection refused):
```
Request: 10ms network + 1ms to get refused = 11ms
Thread blocked: 11ms
Capacity impact: Minimal
```

**Slow response** (timeout):
```
Request: 10ms network + 30,000ms waiting = 30,010ms
Thread blocked: 30 seconds
Capacity impact: Catastrophic
```

**One slow thread = 2,727 fast failures worth of capacity**

### Common Causes

#### 1. Resource Contention

- Database lock waits
- Memory allocation stalls
- Thread pool exhaustion
- I/O queueing

#### 2. Unbounded Queries

```sql
-- Fast in dev (100 rows)
SELECT * FROM orders WHERE user_id = ?

-- Slow in prod (1,000,000 rows for power user)
SELECT * FROM orders WHERE user_id = ?
```

#### 3. Memory Pressure

- Excessive garbage collection
- Swapping to disk
- Memory fragmentation

#### 4. Network Congestion

- Bandwidth saturation
- Packet loss and retransmission
- Network equipment overload

### Prevention

**Don't let slow become slower**:
1. **Timeouts everywhere** - Kill slow operations
2. **Circuit breaker** - Stop calling when slow detected
3. **Bulkheads** - Isolate slow operations
4. **Query limits** - LIMIT clauses, pagination
5. **Resource monitoring** - Detect contention early

**Slow response detection**:
```javascript
const start = Date.now();
try {
    await externalCall();
} finally {
    const duration = Date.now() - start;
    if (duration > threshold) {
        metrics.recordSlowCall(duration);
        // Circuit breaker uses this data
    }
}
```

### Remember This

- ⚠️ **Slow response is worse than failure** (ties up resources longer)
- ⚠️ **One slow call = hundreds of fast calls** in capacity impact
- ⚠️ **Slow responses often come in groups** (cascading effect)
- ✅ **Always use timeouts** (aggressive thresholds)
- ✅ **Circuit breaker on slow responses** (not just failures)
- ✅ **Monitor response times** (percentiles, not averages)

---

## Unbounded Result Sets

**Memory exhaustion**

### Description

Queries or operations that can return arbitrarily large result sets will eventually exhaust memory.

### Common Scenarios

#### 1. Fetch All Pattern

```javascript
// Dangerous: Could be millions of rows
const allOrders = await db.query('SELECT * FROM orders');

// Safe: Pagination
const recentOrders = await db.query(
    'SELECT * FROM orders ORDER BY created_at DESC LIMIT 100'
);
```

#### 2. Power Users

**Normal user**: 10 orders
**Power user**: 100,000 orders

```javascript
// Works for normal users, kills server for power users
const userOrders = await getUserOrders(userId);
// Returns 100,000 order objects = 50MB of memory
```

#### 3. Time-Based Queries

```javascript
// Fine on day 1
SELECT * FROM logs WHERE application = 'web'

// Catastrophic on day 365
// Returns 100 million rows
```

#### 4. Join Explosions

```sql
-- Looks innocent
SELECT * FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id

-- Power user with 1,000 orders × 10 items each = 10,000 rows returned
-- Should be 1 user row
```

### Prevention

**Always bound results**:
1. **Use LIMIT clauses** - Every query
2. **Pagination** - Never fetch all
3. **Streaming/cursors** - For large datasets
4. **Aggregation** - Return counts/sums, not details

**Design for power law**:
- Most users are "normal"
- Some users are outliers (10x-1000x normal)
- Design for the outliers, not the average

**Query patterns**:
```javascript
// Bad: Unbounded
SELECT * FROM orders WHERE user_id = ?

// Good: Bounded
SELECT * FROM orders 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 100 OFFSET ?

// Better: With warning
const orders = await getOrders(userId, limit, offset);
if (orders.length === limit) {
    log.warn(`User ${userId} has many orders, results truncated`);
}
```

### Remember This

- ⚠️ **Every query can return unlimited rows** (without LIMIT)
- ⚠️ **Power users will find your unbounded queries** (Murphy's Law)
- ⚠️ **Time-based queries grow forever** (today's fast query is tomorrow's timeout)
- ⚠️ **Joins can multiply result sizes** (cartesian explosions)
- ✅ **Always use LIMIT** (or equivalent)
- ✅ **Design for power law distribution** (not average user)
- ✅ **Implement pagination** from day one

---

## Summary Table

| Antipattern | Primary Symptom | Prevention |
|------------|----------------|------------|
| **Integration Points** | Hangs, timeouts, cascading failures | Timeouts, Circuit Breaker, Test Harness |
| **Chain Reactions** | Sequential failures across cluster | Autoscaling, Bulkheads, Fix leaks |
| **Cascading Failures** | Failures jump layers | Timeouts, Circuit Breaker, Bulkheads |
| **Users** | Memory exhaustion, capacity issues | Session management, Rate limiting, Load testing |
| **Blocked Threads** | Decreasing capacity, hangs | Timeouts, Async patterns, Resource limits |
| **Self-Denial** | Campaign-induced outages | Coordination, Rate limiting, Static pages |
| **Scaling Effects** | Quadratic growth in resource usage | Hub-and-spoke, Replication, Caching |
| **Unbalanced Capacities** | One tier overloads another | Capacity planning, Rate limiting, Monitoring |
| **Slow Responses** | Capacity degradation | Aggressive timeouts, Circuit breaker, Bulkheads |
| **Unbounded Results** | Memory exhaustion, OOM errors | LIMIT clauses, Pagination, Streaming |

---

## Next Steps

- Read [PATTERNS.md](./PATTERNS.md) for solutions to these antipatterns
- See [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) for deployment considerations
- Review [CHAOS-ENGINEERING.md](./CHAOS-ENGINEERING.md) for testing approaches

