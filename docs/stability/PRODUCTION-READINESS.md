# Production Readiness Checklist

> Reference guide from "Release It!" - Design for Production

## Overview

**"Feature complete" ≠ "Production ready"**

A system is production-ready when it can:
- Run without constant human intervention
- Survive component failures
- Handle unexpected load
- Be monitored and debugged in production
- Be deployed safely and frequently

This document covers the infrastructure, configuration, transparency, and operational concerns necessary for production systems.

---

## Design for Production Philosophy

### The Reality of Production

**Lab vs. Production**:
- Lab: Controlled, predictable, known inputs
- Production: Chaotic, unpredictable, hostile

**Key differences**:
- Real users do unexpected things
- Traffic comes in spikes
- Networks partition
- Disks fill up
- Services crash
- Dependencies fail

**Cynical software expects bad things and is never surprised.**

---

## Infrastructure

### Physical vs. Virtual vs. Cloud

#### Physical Hosts

**Characteristics**:
- Long-lived (years)
- Manual provisioning
- Known locations
- Expensive

**Considerations**:
- SAN/NAS for shared storage
- Hardware redundancy (RAID, redundant power, NICs)
- Physical security
- Heat/cooling management

**Largely obsolete** for new deployments.

#### Virtual Machines

**Characteristics**:
- Medium-lived (weeks to months)
- Automated provisioning
- Oversubscription possible
- Cheaper than physical

**Considerations**:
- **Clock skew**: VMs can lose time (use NTP)
- **Oversubscription**: Host might run 100 VMs on 64 cores
- **I/O contention**: Shared disk can be slow
- **Network**: Virtual NICs share physical NIC

#### Containers

**Characteristics**:
- Short-lived (minutes to days)
- Very fast startup
- Immutable infrastructure
- Lightweight

**Considerations**:
- **Ephemeral storage**: Container death = data loss
- **External storage required**: Mount volumes for persistence
- **Overlay networks**: Add latency
- **Configuration injection**: Environment variables, config maps

**Best practices**:
```dockerfile
# Dockerfile for production
FROM node:18-alpine

# Run as non-root
RUN addgroup -g 1001 -S app
RUN adduser -S -D -u 1001 -s /sbin/nologin app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Graceful shutdown
STOPSIGNAL SIGTERM

# Application
WORKDIR /app
COPY --chown=app:app . .
RUN npm ci --production

CMD ["node", "server.js"]
```

#### Cloud VMs

**Characteristics**:
- Ephemeral (can disappear anytime)
- Elastic (scale up/down automatically)
- API-driven
- Pay-per-use

**Considerations**:
- **Ephemeral identity**: IP addresses change
- **Use Elastic IPs** for stable addresses
- **Autoscaling**: Automatic capacity management
- **Load balancers**: Distribute traffic
- **Availability zones**: Physical separation

---

## Networking

### Network Interface Cards (NICs)

**Considerations**:
- **Single NIC**: Single point of failure
- **Redundant NICs**: Bonding/teaming for HA
- **10 Gbps vs 1 Gbps**: Know your bandwidth limits

### IP Addresses

**Static vs. Dynamic**:
```
Static: Manually configured, doesn't change
Dynamic: DHCP assigned, can change on reboot
```

**For servers**: Use static IPs or reserved DHCP leases.

### Multihoming

**Multiple network interfaces**:
```
eth0: Public internet (customers)
eth1: Private network (databases)
eth2: Management network (monitoring)
```

**Benefits**:
- Security isolation
- Traffic segregation
- Bandwidth optimization

### VLANs (Virtual LANs)

**Logical network segmentation**:
```
VLAN 10: Web servers
VLAN 20: Application servers
VLAN 30: Databases
VLAN 99: Management
```

**Benefits**:
- Security boundaries
- Broadcast domain isolation
- Simplified routing

### Firewalls

**The "5 AM Problem" revisited**:

**Issue**: Firewalls drop idle connections
```
Application opens DB connection
Connection idle for 1 hour
Firewall drops connection from state table
Application tries to use connection
Thread blocks for 10-30 minutes
```

**Solutions**:
1. **TCP keepalive**: Send periodic packets
```javascript
const pool = new Pool({
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
});
```

2. **Application-level ping**: Query every N minutes
```javascript
setInterval(async () => {
    await db.query('SELECT 1');  // Keep connection alive
}, 5 * 60 * 1000);  // Every 5 minutes
```

3. **Shorter connection lifetime**: Close and reopen
```javascript
const pool = new Pool({
    idleTimeoutMillis: 30000  // Close after 30 sec idle
});
```

---

## Configuration

### Configuration Files

**Per-environment configuration**:
```
config/
  development.json
  staging.json
  production.json
```

**Problems**:
- Sensitive data in version control
- Requires rebuild for config changes
- Hard to update in emergency

### Injected Configuration

**Environment variables** (12-factor app):
```bash
# .env
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
REDIS_URL=redis://...
```

```javascript
// Application reads from environment
const dbUrl = process.env.DATABASE_URL;
const stripeKey = process.env.STRIPE_SECRET_KEY;
```

**Benefits**:
- No secrets in code
- Same binary for all environments
- Easy to change without rebuild

**Docker/Kubernetes**:
```yaml
# Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  DATABASE_URL: "postgresql://..."
  
---
# Pod uses ConfigMap
spec:
  containers:
  - name: app
    envFrom:
    - configMapRef:
        name: app-config
```

### Configuration Services

**Centralized configuration** (ZooKeeper, etcd, Consul):

```javascript
// Application fetches config from service
const config = await consul.kv.get('app/database-url');
```

**Benefits**:
- Runtime configuration changes
- Centralized management
- Configuration versioning
- Dynamic reconfiguration

**Use cases**:
- Feature flags
- A/B test configurations
- Circuit breaker thresholds
- Rate limits

---

## Transparency

### Logging

**Requirements**:
1. **Structured logging**: JSON format
```javascript
logger.info('User login', {
    userId: user.id,
    email: user.email,
    ip: req.ip,
    timestamp: new Date().toISOString()
});
```

2. **Log levels**: DEBUG, INFO, WARN, ERROR
```javascript
// Production: INFO and above
// Development: DEBUG and above
const logLevel = process.env.LOG_LEVEL || 'info';
```

3. **Correlation IDs**: Track requests across services
```javascript
// Add request ID to all logs
app.use((req, res, next) => {
    req.id = generateId();
    logger = logger.child({ requestId: req.id });
    next();
});
```

4. **Log rotation**: Don't fill disk
```javascript
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: 'app.log',
            maxsize: 100 * 1024 * 1024,  // 100MB
            maxFiles: 10
        })
    ]
});
```

**What to log**:
- ✅ All errors with stack traces
- ✅ Authentication attempts
- ✅ Authorization failures
- ✅ External API calls (with duration)
- ✅ Database operations (with duration)
- ✅ State transitions
- ❌ Sensitive data (passwords, tokens, PII)
- ❌ Too much (impacts performance)

### Metrics

**Key metrics**:

**System metrics**:
- CPU usage
- Memory usage
- Disk usage
- Network I/O
- Open file descriptors

**Application metrics**:
- Request rate (requests/sec)
- Error rate (errors/sec)
- Response time (p50, p95, p99)
- Active requests
- Queue depths

**Business metrics**:
- User signups
- Orders placed
- Revenue
- Conversion rate

**Implementation**:
```javascript
// Prometheus-style metrics
const promClient = require('prom-client');

// Counter: Things that only go up
const requestCounter = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'path', 'status']
});

// Histogram: Distribution of values
const requestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Gauge: Values that go up and down
const activeConnections = new promClient.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
});

// Middleware to record metrics
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        
        requestCounter.inc({
            method: req.method,
            path: req.path,
            status: res.statusCode
        });
        
        requestDuration.observe(duration);
    });
    
    next();
});
```

### Health Checks

**Shallow vs. Deep**:

**Shallow** (for load balancers):
```javascript
// Returns 200 if server is running
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
```

**Deep** (for monitoring):
```javascript
// Checks dependencies
app.get('/health/deep', async (req, res) => {
    const checks = {
        database: await checkDatabase(),
        redis: await checkRedis(),
        stripe: await checkStripe()
    };
    
    const healthy = Object.values(checks).every(c => c.healthy);
    
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'healthy' : 'degraded',
        checks,
        timestamp: Date.now()
    });
});

async function checkDatabase() {
    try {
        await db.query('SELECT 1');
        return { healthy: true, latency: 5 };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}
```

**Readiness vs. Liveness** (Kubernetes):

```yaml
# Liveness: Is the container alive?
# (If not, restart it)
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

# Readiness: Can it serve traffic?
# (If not, remove from load balancer)
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Interconnect

### Load Balancing

**Methods**:

1. **DNS Round Robin** (simplest)
```
app.example.com → 192.0.2.1
app.example.com → 192.0.2.2
app.example.com → 192.0.2.3
```

**Pros**: Simple, no additional infrastructure
**Cons**: No health checks, uneven distribution, DNS caching

2. **Hardware Load Balancer** (F5, Citrix)
**Pros**: High performance, advanced features
**Cons**: Expensive, single point of failure (needs HA pair)

3. **Software Load Balancer** (HAProxy, NGINX)
```nginx
upstream backend {
    server 192.0.2.1:3000;
    server 192.0.2.2:3000;
    server 192.0.2.3:3000;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

**Pros**: Flexible, cost-effective, scriptable
**Cons**: Requires CPU/memory, becomes bottleneck at scale

4. **Cloud Load Balancer** (AWS ALB/NLB, GCP LB)
**Pros**: Managed, auto-scaling, integrated health checks
**Cons**: Vendor lock-in, costs

**Load balancing algorithms**:
- **Round robin**: Distribute evenly
- **Least connections**: Send to least-busy server
- **IP hash**: Same client → same server (sticky sessions)
- **Weighted**: More capacity → more traffic

### Service Discovery

**Problem**: How do services find each other?

**Static** (configuration files):
```json
{
  "database": "db1.example.com:5432",
  "redis": "cache1.example.com:6379"
}
```

**Pros**: Simple
**Cons**: Manual updates, doesn't handle failures

**Dynamic** (service registry):
```javascript
// Service registers itself
await serviceRegistry.register('api-server', {
    host: getHostname(),
    port: 3000,
    health: '/health'
});

// Heartbeat to stay registered
setInterval(async () => {
    await serviceRegistry.heartbeat('api-server');
}, 30000);

// Client discovers services
const apiServers = await serviceRegistry.discover('api-server');
const server = pickRandom(apiServers);
```

**Technologies**:
- Consul
- etcd
- ZooKeeper
- Kubernetes Services (built-in)

---

## Deployment

### Immutable Infrastructure

**Principle**: Never modify running servers

**Traditional** (mutable):
```bash
# SSH into server
ssh prod-server-1
cd /app
git pull
npm install
pm2 restart
```

**Problems**:
- Servers drift over time
- Hard to roll back
- Debugging "works on my machine"

**Modern** (immutable):
```bash
# Build new image
docker build -t app:v2.0 .

# Deploy new containers
kubectl set image deployment/app app=app:v2.0

# Old containers destroyed, new ones created
```

**Benefits**:
- Identical environments
- Easy rollback (previous image)
- Testable (same image in staging and prod)

### Blue-Green Deployment

**Setup**:
```
Blue environment: Currently serving traffic
Green environment: New version, not serving traffic
```

**Process**:
1. Deploy new version to Green
2. Test Green environment
3. Switch traffic: Blue → Green
4. Keep Blue running (for quick rollback)
5. If problems: Switch back Blue
6. If successful: Destroy Blue

### Canary Deployment

**Gradual rollout**:
```
Deploy new version to 1% of servers
Monitor metrics
If healthy: 1% → 10%
If healthy: 10% → 50%
If healthy: 50% → 100%
If problems at any point: Rollback
```

**Implementation** (Kubernetes):
```yaml
# 99 pods running v1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-v1
spec:
  replicas: 99
  template:
    metadata:
      labels:
        app: myapp
        version: v1

---
# 1 pod running v2 (canary)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-v2-canary
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: myapp
        version: v2

---
# Service sends to both (1% to v2)
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp  # Matches both v1 and v2
```

### Database Migrations

**Expand-Contract pattern**:

**Phase 1: Expand** (add new)
```sql
-- Add new column (nullable)
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NULL;

-- Application writes to both old and new
UPDATE users SET email_verified = (status = 'verified');
```

**Phase 2: Migrate data**
```sql
-- Backfill data
UPDATE users 
SET email_verified = (status = 'verified')
WHERE email_verified IS NULL;
```

**Phase 3: Contract** (remove old)
```sql
-- Make column non-nullable
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;

-- Remove old column
ALTER TABLE users DROP COLUMN status;
```

**Principles**:
- Never break old code
- Each phase independently deployable
- Can roll back at any point

---

## Security

### Principle of Least Privilege

**Application**: Only permissions needed

```bash
# Bad: Run as root
docker run myapp

# Good: Run as non-root user
docker run --user 1001:1001 myapp
```

**Database**: Limited permissions
```sql
-- Bad: Application uses admin account
GRANT ALL PRIVILEGES ON DATABASE app TO app_user;

-- Good: Application uses restricted account
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- No DELETE, no CREATE TABLE, no DROP
```

**AWS IAM**: Specific permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::my-bucket/*"
}
```

### Configured Passwords

**Never hardcode**:
```javascript
// ❌ Bad
const db = new Pool({
    password: 'supersecret123'
});

// ✅ Good
const db = new Pool({
    password: process.env.DATABASE_PASSWORD
});
```

**Password management**:
- Environment variables (development)
- Secrets management (production)
  - AWS Secrets Manager
  - HashiCorp Vault
  - Kubernetes Secrets

### Security as Ongoing Process

**Not a one-time checklist**:
- Regular dependency updates
- Security scanning in CI/CD
- Penetration testing
- Security training

---

## Production Readiness Checklist

### Infrastructure
- [ ] Redundant servers (no single points of failure)
- [ ] Health checks configured
- [ ] Load balancer in place
- [ ] Autoscaling configured
- [ ] Multiple availability zones
- [ ] Firewall rules reviewed
- [ ] Network segmentation (VLANs)

### Configuration
- [ ] All secrets in environment variables (not code)
- [ ] Configuration per environment
- [ ] No hardcoded URLs/IPs
- [ ] Feature flags for risky changes

### Transparency
- [ ] Structured logging (JSON)
- [ ] Log rotation configured
- [ ] Metrics exported (Prometheus/equivalent)
- [ ] Health check endpoints
- [ ] Correlation IDs on all requests
- [ ] Error tracking (Sentry/equivalent)

### Resilience
- [ ] Timeouts on all external calls
- [ ] Circuit breakers on integration points
- [ ] Bulkheads for resource isolation
- [ ] Graceful degradation
- [ ] Retry with exponential backoff

### Database
- [ ] Connection pooling configured
- [ ] Pool size limits set
- [ ] Query timeouts
- [ ] TCP keepalive enabled
- [ ] Automated backups
- [ ] Tested restore procedure
- [ ] Migration strategy (expand-contract)

### Deployment
- [ ] Immutable infrastructure
- [ ] Zero-downtime deployments
- [ ] Automated rollback
- [ ] Canary deployment capability
- [ ] Deployment rate limiting (governor)

### Security
- [ ] Least privilege for all accounts
- [ ] No secrets in code
- [ ] HTTPS everywhere
- [ ] Security headers configured
- [ ] Dependency scanning
- [ ] Vulnerability management process

### Operations
- [ ] Runbook for common issues
- [ ] On-call rotation defined
- [ ] Alerting configured
- [ ] Dashboard for key metrics
- [ ] Incident response plan
- [ ] Post-mortem process

---

## Next Steps

- Review [ANTIPATTERNS.md](./ANTIPATTERNS.md) and [PATTERNS.md](./PATTERNS.md)
- See [CHAOS-ENGINEERING.md](./CHAOS-ENGINEERING.md) for testing production readiness
- Review [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) for detailed security requirements

