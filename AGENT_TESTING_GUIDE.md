# Agentic E2E Testing Guide

This guide is designed for AI agents to perform rigorous End-to-End (E2E) testing on the **SiteSprintz** application. It combines automated verification with "manual-style" visual exploration to ensure high confidence.

## 1. Environment Setup & Pre-flight Checks

Before running any tests, ensure the environment is clean and running.

### Database Setup
The application uses Prisma with PostgreSQL.
```bash
# Reset database and seed with fresh data
npx prisma migrate reset --force
npm run seed  # If a specific seed script exists, otherwise check package.json
```
*Tip: If `npm run seed` is missing, check `prisma/seed.ts` or `scripts/create-admin.js` for data population.*

### Server Startup
Run the backend and frontend concurrently for full E2E testing.
```bash
npm run dev:all
# OR separate terminals:
# Terminal 1: npm run dev:backend
# Terminal 2: npm run dev
```
**Wait target**: Ensure `Server running on port 3000` (backend) and `Local: http://localhost:5173` (frontend) appear in logs.

---

## 2. Automated Validation (The Baseline)

Always start with the existing automated suite to catch regressions quickly.

### Playwright E2E Tests
This is the most reliable signal for functional correctness.
```bash
npm run test:e2e
```
- **Success**: All tests pass (green).
- **Failure**: Analyze the `playwright-report/index.html` (if available) or the terminal output.
    - *Common issue*: If tests fail due to timeouts, ensure the server is running on the expected port (usually 3000 for these tests).

### Unit/Integration Tests
For targeted logic verification.
```bash
npm run test:e2e # In this project, test:e2e seems to be the primary functional suite.
# See package.json for "test" or "vitest" scripts for unit tests.
npm run test
```

---

## 3. Agentic "Manual" Verification (The Quality Layer)

Automated tests check *code correctness*, but manual verification checks *user experience*. As an agent, you should simulate a human user.

### Why do this?
- To verify UI polish (animations, layout alignment).
- To catch "soft" bugs (e.g., button works but looks disabled, confusing navigation).
- To ensure the "Happy Path" *feels* right.

### Tools to Use
Use the `browser_subagent` tool.
- **Recordings**: Always assign a descriptive `RecordingName` (e.g., `manual_login_check`).
- **Assertion**: Use `read_browser_page` often to inspect the DOM for expected elements after actions.

### Critical Manual Test Flows

#### A. The "Admin/Owner" Flow (Golden Path)
1.  **Login**:
    - Navigate to `/login`.
    - Enter admin credentials (usually `admin@example.com` / `password123` - verify in seed data).
    - **Verify**: Redirects to Dashboard. Check for "Welcome, [Name]".
2.  **Dashboard Check**:
    - verify key widgets load (Revenue, User count).
    - **Visual**: Are charts rendering? (Look for `<canvas>` or specific chart elements).
3.  **Settings Change**:
    - Go to `/settings`.
    - Change a non-critical field (e.g., "Company Name").
    - Save.
    - **Verify**: Success toast message appears. Reload page to confirm persistence.

#### B. The "New User" Flow
1.  **Registration**:
    - Navigate to `/register`.
    - Create a new account with a random email.
    - **Verify**: Redirects to Onboarding or Dashboard.
2.  **Service Interaction**:
    - Attempt to use a core feature (e.g., "Create Site" or "Book Appointment").
    - **Verify**: Modal opens, forms submit without errors.

#### C. Error State Handling
1.  **Invalid Login**:
    - Try logging in with `wrong@user.com`.
    - **Verify**: "Invalid credentials" error message appears (Red text).
2.  **404 Check**:
    - Navigate to `/random-non-existent-page`.
    - **Verify**: Custom 404 page loads (not a generic browser error).

---

## 4. Reporting Your Findings

After testing, you must create a transparent report for the user in `walkthrough.md`.

### Template for Verification Report

```markdown
## 🧪 Verification Check
**Mode**: [Automated + Manual]

### Automated Results
- [x] Playwright E2E Tests: **PASS** (12/12 suites)
- [ ] Unit Tests: **SKIPPED** (Not relevant for this specific change)

### Manual Verification
I performed a manual walkthrough of the [Login -> Dashboard] flow.

**1. Login Flow**
- Action: Entered valid credentials.
- Result: Successfully redirected to Dashboard.
- Observation: Load time was < 1s.

**2. Visual Check**
- Dashboard Charts: [Rendered Correctly]
- Mobile Responsiveness: Checked on iPhone 12 viewport, menu collapsed correctly.

### Issues Found
> [!WARNING]
> The "Profile" image placeholder seems broken on the settings page.
```

## 5. Troubleshooting Common Issues

- **"Connection Refused"**: Backend isn't running. Check `npm run dev:all` logs.
- **"Element invalid"**: The UI might have changed. Use `read_browser_page` to inspect the current DOM structure and update your selectors.
- **Stuck Loading**: Check the browser console logs (via subagent) for JS errors or network 500s.
