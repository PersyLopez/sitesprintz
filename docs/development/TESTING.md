# Testing

SiteSprintz uses **Vitest** for unit and integration tests, **Playwright** for end-to-end tests, and YAML plans under `tests/mantest/` for manual verification.

Last updated: 15 August 2026

## Test structure

```
tests/
├── unit/             # Components, utilities, services
├── integration/      # API endpoints and service integrations
├── e2e/              # Playwright end-to-end flows
├── mantest/          # Manual test plans
├── security/         # Security focused checks
├── helpers/          # Shared test utilities
├── fixtures/         # Reusable test data
├── mocks/            # Mock implementations
└── setup/            # Test data seeding
```

## Running tests

```bash
# Unit and integration
npm test
npm test -- tests/unit/auth.test.js
npm test -- --reporter=verbose

# E2E
npm run test:e2e
npx playwright test tests/e2e/auth-flow.spec.js
npx playwright test --headed
```

## Writing tests

- Follow the Arrange-Act-Assert pattern.
- Mock external dependencies: database, network, email, Stripe.
- Keep tests isolated; do not depend on execution order.
- Use dedicated fixtures and seed data instead of production data.

### Component and E2E selectors

Use the most stable selector first:

1. `data-testid`
2. `getByRole`
3. `getByText`

Do not use CSS classes, XPath, or auto-generated IDs for selectors.

## Test generation and fixes

When generating or fixing tests, work in small batches:

- One function, endpoint, or user journey at a time.
- Maximum 10 tests per batch.
- Verify the previous batch passes before starting the next one.

## Related documentation

- `docs/development/JS-STANDARDS.md`
- `docs/development/TDD-GUIDELINES.md`
- `AGENTS.md` for critical flows (site creation, tiers, sections, e-commerce)
