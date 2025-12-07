# Chaos Engineering

> Reference guide from "Release It!" - Testing resilience in production

## Overview

**Chaos Engineering**: The discipline of experimenting on a distributed system in order to build confidence in its ability to withstand turbulent conditions in production.

**Core principle**: The best way to avoid failures in production is to fail constantly in production (in a controlled manner).

---

## Philosophy

### Why Chaos Engineering?

**Traditional testing**:
- Unit tests: Individual components work
- Integration tests: Components work together
- Load tests: System handles expected load

**What traditional testing misses**:
- Emergent behavior in production
- Real-world failure combinations
- How system behaves under partial failures
- Human operators under stress

**Chaos engineering tests**:
- Actual production system
- Real traffic patterns
- Real dependencies
- Real data
- Real scale

### Emergent Properties

**Definition**: Behaviors that emerge from the interaction of components, not predictable from components alone.

**Example**: Traffic jams
- Each driver follows simple rules
- Individual driver behavior is fine
- Interaction creates traffic jams (emergent property)
- Cannot be predicted by studying one car

**In distributed systems**:
- Individual services work fine
- Under load + partial failure: cascading failure emerges
- Cannot be predicted from unit tests

---

## Prerequisites

### Before You Start

**DO NOT** do chaos engineering unless you have:

1. **Limited blast radius**
   - Ability to contain experiments
   - Quick stop mechanism
   - Traffic isolation (test on subset)

2. **Comprehensive monitoring**
   - Real-time metrics
   - Alerting
   - Ability to detect problems immediately

3. **Known healthy state**
   - Baseline metrics
   - SLAs/SLOs defined
   - Know what "normal" looks like

4. **Recovery plan**
   - Rollback procedure
   - Incident response process
   - On-call team ready

**If missing any of these**: Fix them first!

---

## The Simian Army

**Netflix's chaos engineering tools** (the origin):

### Chaos Monkey

**What it does**: Randomly terminates instances in production

**Purpose**: Ensure system survives instance failures

**Implementation concept**:
```javascript
// Simplified Chaos Monkey
setInterval(async () => {
    const instances = await getProductionInstances();
    const victim = pickRandom(instances);
    
    if (shouldKill(victim)) {
        console.log(`💀 Chaos Monkey killing ${victim.id}`);
        await killInstance(victim.id);
    }
}, 60 * 60 * 1000);  // Every hour

function shouldKill(instance) {
    // Rules:
    // - Don't kill during business hours?
    // - Don't kill more than 10% of fleet
    // - Don't kill if recent deployments
    return Math.random() < 0.1;  // 10% chance
}
```

**What it teaches**:
- Autoscaling works
- Health checks work
- Load balancer removes dead instances
- Application handles instance loss
- Monitoring detects and alerts

### Latency Monkey

**What it does**: Introduces artificial delays in service responses

**Purpose**: Ensure system handles slow dependencies

**Implementation concept**:
```javascript
// Middleware to inject latency
app.use(async (req, res, next) => {
    if (isLatencyMonkeyEnabled() && shouldAddLatency()) {
        const delay = randomBetween(1000, 10000);  // 1-10 seconds
        console.log(`🐵 Latency Monkey adding ${delay}ms delay`);
        await sleep(delay);
    }
    next();
});
```

**What it teaches**:
- Timeouts are configured correctly
- Circuit breakers trip
- Users see degraded experience (not total failure)
- Monitoring detects slow responses

### Chaos Kong

**What it does**: Simulates entire AWS region failure

**Purpose**: Ensure multi-region failover works

**Implementation**: Terminates all instances in one region

**What it teaches**:
- Multi-region setup works
- DNS/traffic routing works
- Data replication works
- Staff knows failover procedure

### Conformity Monkey

**What it does**: Finds instances that don't conform to best practices

**Purpose**: Ensure operational excellence

**Examples**:
- Instance without autoscaling group
- Security group too permissive
- Missing health check
- Old AMI version

### Janitor Monkey

**What it does**: Cleans up unused resources

**Purpose**: Cost optimization, reduce attack surface

**Targets**:
- Instances without tags
- Unattached volumes
- Old snapshots
- Test resources left running

---

## Designing Chaos Experiments

### The Scientific Method

**1. Form hypothesis**
```
Hypothesis: If we kill 20% of web servers,
remaining servers will handle traffic without
exceeding 500ms p99 latency.
```

**2. Define steady state (invariants)**
```
Invariants to maintain:
- p99 latency < 500ms
- Error rate < 0.1%
- All requests complete (no timeouts)
```

**3. Introduce chaos**
```
Action: Randomly kill 20% of web servers
Duration: 10 minutes
```

**4. Measure**
```
Metrics to collect:
- Request latency (p50, p95, p99)
- Error rate
- Successful requests per second
- CPU usage on remaining servers
```

**5. Compare to hypothesis**
```
Result: p99 latency increased to 750ms (exceeded 500ms)
Conclusion: Hypothesis falsified
Action: Increase server capacity or optimize code
```

### Example Experiments

#### Experiment 1: Database Failure

**Hypothesis**: System can handle database primary failure

**Steady state**:
- All requests succeed
- p99 latency < 100ms

**Chaos**:
- Kill database primary
- Wait for automatic failover

**Expected outcome**:
- Brief spike in errors (during failover)
- Recovery within 30 seconds
- Latency returns to normal

**What might go wrong**:
- Failover doesn't happen (manual intervention required)
- Connection pool doesn't detect new primary
- Some requests fail permanently (no retry logic)

#### Experiment 2: Network Partition

**Hypothesis**: System handles network partition between services

**Steady state**:
- All features work
- Error rate < 0.1%

**Chaos**:
- Block network traffic between web tier and API tier
- Duration: 5 minutes

**Expected outcome**:
- Circuit breakers open
- Fallback behavior activates
- Degraded but functional

**What might go wrong**:
- No timeouts → threads block forever
- No circuit breaker → keep trying
- No fallback → complete failure

#### Experiment 3: High Traffic Spike

**Hypothesis**: System handles 10x normal traffic

**Steady state**:
- Normal traffic: 1000 req/sec
- p99 latency < 200ms

**Chaos**:
- Generate 10,000 req/sec
- Duration: 10 minutes

**Expected outcome**:
- Autoscaling triggers
- New instances start
- Load distributes
- Latency remains acceptable

**What might go wrong**:
- Autoscaling too slow
- Database can't handle load
- Memory exhaustion
- Complete outage

---

## Injecting Chaos

### Methods

#### 1. Instance Termination

```bash
# AWS CLI
aws ec2 terminate-instances --instance-ids i-1234567890abcdef0

# Kubernetes
kubectl delete pod my-app-pod-xyz

# Docker
docker stop container-id
```

#### 2. Network Manipulation

**Add latency**:
```bash
# Linux tc (traffic control)
tc qdisc add dev eth0 root netem delay 100ms 20ms
# Adds 100ms ± 20ms latency
```

**Drop packets**:
```bash
tc qdisc add dev eth0 root netem loss 10%
# Drops 10% of packets
```

**Limit bandwidth**:
```bash
tc qdisc add dev eth0 root tbf rate 1mbit burst 32kbit latency 400ms
# Limit to 1 Mbps
```

**Block specific traffic**:
```bash
# iptables
iptables -A OUTPUT -p tcp --dport 5432 -j DROP
# Block outgoing connections to port 5432 (PostgreSQL)
```

#### 3. Resource Exhaustion

**CPU stress**:
```bash
# stress-ng
stress-ng --cpu 4 --timeout 60s
# Max out 4 CPU cores for 60 seconds
```

**Memory stress**:
```bash
stress-ng --vm 2 --vm-bytes 2G --timeout 60s
# Allocate 2GB RAM for 60 seconds
```

**Disk I/O stress**:
```bash
stress-ng --hdd 4 --timeout 60s
# Max out disk I/O
```

#### 4. Application-Level Failures

**Inject errors in code**:
```javascript
// Feature flag for chaos
if (chaosConfig.enabled && Math.random() < chaosConfig.errorRate) {
    throw new Error('Chaos Engineering: Simulated failure');
}
```

**Reject requests**:
```javascript
app.use((req, res, next) => {
    if (chaosConfig.enabled && shouldReject(req)) {
        return res.status(503).json({
            error: 'Chaos Engineering: Service unavailable'
        });
    }
    next();
});
```

#### 5. Time Manipulation

**Clock skew**:
```bash
# Set system time 5 hours in the future
date -s "+5 hours"
```

**Tests**:
- Do timeouts work correctly?
- Does certificate validation break?
- Do log timestamps make sense?

### Chaos Engineering Tools

**Chaos Toolkit** (open source):
```yaml
# chaos-experiment.yaml
title: Database failure experiment
description: Test system resilience to DB failure
steady-state-hypothesis:
  title: Application is healthy
  probes:
  - type: probe
    name: app-responds
    tolerance: 200
    provider:
      type: http
      url: http://app.example.com/health

method:
- type: action
  name: terminate-database
  provider:
    type: process
    path: kubectl
    arguments: delete pod postgres-0

rollbacks:
- type: action
  name: restore-database
  provider:
    type: process
    path: kubectl
    arguments: apply -f postgres.yaml
```

**Gremlin** (commercial):
- Web UI for experiments
- Pre-built attack scenarios
- Safety controls
- Scheduling

**Litmus** (Kubernetes):
- CRD-based chaos experiments
- Pod deletion, network chaos, I/O chaos
- Integration with K8s

---

## Opt-In vs. Opt-Out

### Opt-In (Start Here)

**Services explicitly enroll** in chaos engineering:
```yaml
# Service metadata
apiVersion: v1
kind: Pod
metadata:
  labels:
    chaos: enabled
```

**Chaos tool**:
```javascript
const targets = await getServices({ label: 'chaos=enabled' });
// Only target services that opted in
```

**Pros**:
- Safe for new systems
- Teams control their risk
- Build confidence gradually

**Cons**:
- Less realistic (prepared services)
- Doesn't test interactions with unprepared services

### Opt-Out (Advanced)

**All services are targets** unless explicitly excluded:
```yaml
metadata:
  labels:
    chaos: disabled  # Excluded
```

**Pros**:
- More realistic
- Tests entire system
- Catches edge cases

**Cons**:
- Requires mature practices
- Needs executive buy-in
- Higher risk

**Progression**:
```
Month 1-3: Opt-in, selected services
Month 4-6: Opt-in, all non-critical services
Month 7-9: Opt-out, critical services excluded
Month 10+: Opt-out, only specific experiments excluded
```

---

## Game Days

**Definition**: Scheduled chaos engineering exercises involving multiple teams.

### Planning a Game Day

**3-4 weeks before**:
- [ ] Choose date/time
- [ ] Notify all teams
- [ ] Define scenarios
- [ ] Prepare chaos scripts
- [ ] Set up monitoring dashboards
- [ ] Confirm on-call coverage

**1 week before**:
- [ ] Review runbooks
- [ ] Test chaos tools
- [ ] Brief participants
- [ ] Set expectations

**Day of**:
- [ ] All hands on deck
- [ ] Run experiments
- [ ] Document everything
- [ ] Take notes on unexpected behaviors

**After**:
- [ ] Debrief meeting
- [ ] Document findings
- [ ] Create action items
- [ ] Schedule fixes

### Example: Zombie Apocalypse Simulation

**Scenario**: Black Friday, everything goes wrong simultaneously

**Chaos injected**:
- 09:00: Kill 30% of web servers
- 09:15: Database primary fails
- 09:30: External payment API has 5-second latency
- 09:45: Redis cache cluster fails
- 10:00: DDoS attack (simulated traffic spike)
- 10:15: Deployment of buggy code (on purpose)

**Goals**:
- System remains functional (degraded OK)
- Team responds effectively
- Incident procedures work
- Communication clear

**What it tests**:
- Technical resilience (circuit breakers, failover, etc.)
- Human resilience (stress, decision-making)
- Process resilience (runbooks, communication)

---

## Automating Chaos

### Continuous Chaos

**Philosophy**: Chaos should be constant, not occasional

**Benefits**:
- Catches regressions immediately
- Team always prepared
- Normalizes failure
- Prevents complacency

**Implementation**:
```javascript
// Chaos Automation Platform (ChAP)
class ChaosScheduler {
    constructor() {
        this.experiments = [];
    }
    
    // Add recurring experiment
    addExperiment(experiment, schedule) {
        this.experiments.push({ experiment, schedule });
    }
    
    async run() {
        for (const exp of this.experiments) {
            if (exp.schedule.shouldRun()) {
                await this.executeExperiment(exp.experiment);
            }
        }
    }
    
    async executeExperiment(experiment) {
        console.log(`Running: ${experiment.name}`);
        
        // 1. Verify steady state
        if (!await experiment.checkSteadyState()) {
            console.log('System not in steady state, skipping');
            return;
        }
        
        // 2. Inject chaos
        await experiment.injectChaos();
        
        // 3. Monitor
        const metrics = await experiment.collect Metrics();
        
        // 4. Verify invariants
        const passed = experiment.checkInvariants(metrics);
        
        // 5. Clean up
        await experiment.rollback();
        
        // 6. Report
        await experiment.report(passed, metrics);
    }
}

// Schedule experiments
const scheduler = new ChaosScheduler();

scheduler.addExperiment(
    new InstanceTerminationExperiment(),
    new DailySchedule('02:00')  // 2 AM daily
);

scheduler.addExperiment(
    new LatencyExperiment(),
    new HourlySchedule()  // Every hour
);

// Run continuously
setInterval(() => scheduler.run(), 60000);  // Every minute
```

### Integration with CI/CD

**Chaos in deployment pipeline**:
```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - chaos
  - deploy

chaos_test:
  stage: chaos
  script:
    - deploy to staging
    - run chaos experiments
    - verify resilience
  only:
    - main
```

**Benefits**:
- Catch resilience regressions before production
- Every deploy tested for resilience
- Automated, no manual effort

---

## Measuring Success

### Metrics

**Resilience score**:
```
Resilience = (Successful requests during chaos) / (Total requests)
```

**MTTR (Mean Time To Recovery)**:
```
From chaos injection to full recovery
```

**Blast radius**:
```
Percentage of users affected
```

**Goal progression**:
```
Month 1: 90% resilience, MTTR < 5 min
Month 3: 95% resilience, MTTR < 2 min
Month 6: 99% resilience, MTTR < 1 min
```

### What Good Looks Like

**Immature chaos engineering**:
- Manual experiments
- Occasional game days
- Lots of surprises
- Long MTTR
- Blame culture

**Mature chaos engineering**:
- Automated, continuous chaos
- No surprises (seen it all before)
- Fast recovery (minutes)
- Learning culture
- Chaos is boring (everything works)

---

## Safety and Ethics

### Rules

1. **Never cause customer harm**
   - Limit blast radius
   - Monitor continuously
   - Have kill switch

2. **Get permission**
   - Management approval
   - Customer communication (if visible)
   - Legal review (if needed)

3. **Start small**
   - Non-production first
   - Small blast radius
   - Short duration
   - Low-impact times

4. **Have rollback**
   - Always have undo
   - Practice rollback
   - Automated if possible

### Red Lines

**DO NOT**:
- ❌ Delete production data
- ❌ Corrupt databases
- ❌ Leak sensitive information
- ❌ Violate compliance (GDPR, HIPAA, etc.)
- ❌ Cause financial loss to customers
- ❌ Run experiments without monitoring

---

## Getting Started

### Week 1: Preparation
- [ ] Set up comprehensive monitoring
- [ ] Define SLOs/SLAs
- [ ] Create runbooks
- [ ] Get buy-in from leadership

### Week 2: First Experiment (Non-Production)
- [ ] Choose simple experiment (kill one instance)
- [ ] Run in staging
- [ ] Document results
- [ ] Fix issues found

### Week 3: Production Experiment (Low Risk)
- [ ] 2 AM on Tuesday (low traffic)
- [ ] Small blast radius (10% of fleet)
- [ ] All hands on deck
- [ ] Document everything

### Week 4: Regular Cadence
- [ ] Schedule recurring experiments
- [ ] Automate data collection
- [ ] Create dashboard
- [ ] Share results with team

### Month 2-3: Expand
- [ ] More experiment types
- [ ] Larger blast radius
- [ ] Business hours experiments
- [ ] Multiple services

### Month 4-6: Maturity
- [ ] Automated, continuous chaos
- [ ] Integration with CI/CD
- [ ] Opt-out model
- [ ] Game days

---

## Common Pitfalls

### 1. "We'll do chaos engineering after launch"

**Problem**: You'll never "have time"

**Reality**: Chaos engineering uncovers problems that WILL happen in production. Better to find them before customers do.

### 2. "Our system is too important for chaos"

**Problem**: If it's too important to test, it's too important to fail

**Reality**: Critical systems need chaos engineering the MOST.

### 3. "We can't afford downtime"

**Problem**: Thinking chaos = downtime

**Reality**: Chaos engineering PREVENTS downtime by finding weaknesses before they cause outages.

### 4. "We know our system is resilient"

**Problem**: Confidence without evidence

**Reality**: The only way to know is to test. You will be surprised.

---

## Summary

**Chaos Engineering is**:
- ✅ Proactive resilience testing
- ✅ Scientific experiments
- ✅ Continuous, automated process
- ✅ Learning opportunity

**Chaos Engineering is NOT**:
- ❌ Breaking things for fun
- ❌ One-time test
- ❌ Optional "nice to have"
- ❌ Only for Netflix-scale systems

**Key Takeaway**: *The best time to find out your system can't handle failure is BEFORE your customers find out.*

---

## Next Steps

- Review [ANTIPATTERNS.md](./ANTIPATTERNS.md) to understand what chaos tests for
- Study [PATTERNS.md](./PATTERNS.md) to know what protections to implement
- See [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) for prerequisites

