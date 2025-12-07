# Contributing to SiteSprintz

Thank you for your interest in contributing to SiteSprintz! This document provides guidelines and instructions for contributing to the project.

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd sitesprintz
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Copy `.env.example` (if available) or create a `.env` file based on the configuration in `server.js`.
    Required variables:
    - `PORT` (default: 3000)
    - `JWT_SECRET`
    - `STRIPE_SECRET_KEY` (optional, for payments)
    - `STRIPE_WEBHOOK_SECRET` (optional)

4.  **Start the development server:**
    ```bash
    npm run dev:all
    ```
    This runs both the frontend (Vite) and backend (Express) servers concurrently.

## Development Workflow

-   **Frontend:** Located in `src` (if applicable) or served from `public`. The project uses React and Vite.
-   **Backend:** Located in `server.js` and `server/` directory.
-   **Database:** Uses PostgreSQL. Ensure your database is running and configured in `.env`.

## Code Style

We use **ESLint** and **Prettier** to maintain code quality and consistency.

-   **Linting:** Run `npm run lint` to check for linting errors.
-   **Formatting:** Run `npm run format` to automatically format your code.

Please ensure your code passes linting before submitting a pull request.

## Testing

We use **Vitest** for unit/integration tests and **Playwright** for end-to-end (E2E) tests.

-   **Run Unit Tests:**
    ```bash
    npm test
    ```

-   **Run E2E Tests:**
    ```bash
    npm run test:e2e
    ```

-   **Test Coverage:**
    ```bash
    npm run test:coverage
    ```

Ensure all tests pass before submitting your changes. Add new tests for new features or bug fixes.

## Project Structure

-   `server.js`: Main entry point for the backend.
-   `server/`: Backend routes, middleware, and utilities.
    -   `routes/`: API route definitions.
    -   `middleware/`: Express middleware (auth, error handling).
    -   `utils/`: Helper functions.
-   `public/`: Static assets and frontend code.
-   `tests/`: Test files.
-   `docs/`: Project documentation.

## Git Workflow

**IMPORTANT:** Follow the proper branch workflow: `dev` → `staging` → `main`

### **Daily Development:**

1. **Start from dev branch:**
   ```bash
   git checkout dev
   git pull origin dev
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/my-feature
   ```

3. **Make changes and commit:**
   ```bash
   git add .
   git commit -m "feat: Your feature description"
   ```

4. **Push feature branch:**
   ```bash
   git push origin feature/my-feature
   ```

5. **Merge to dev:**
   ```bash
   git checkout dev
   git merge feature/my-feature
   git push origin dev
   ```

### **Deploy Process:**

1. **Deploy to staging (testing):**
   ```bash
   git checkout staging
   git merge dev
   git push origin staging
   # Test on staging environment
   ```

2. **Deploy to production:**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   # Auto-deploys to production
   ```

### **Pull Request Process:**

1. Create a new branch for your feature or fix: `git checkout -b feature/my-feature`
2. Make your changes and commit them with clear, descriptive messages
3. Run linting and tests to ensure no regressions
4. Push your branch and open a Pull Request
5. Describe your changes and link to any relevant issues

**⚠️ Never commit directly to `main` or `staging` branches!**

## Documentation

Refer to the `docs/` directory for more detailed documentation:

- **Git Workflow:** [Git Strategy](./docs/setup/GIT-STRATEGY.md) (quick reference) | [Git Workflow Best Practices](./docs/setup/GIT-WORKFLOW-BEST-PRACTICES.md) (comprehensive guide)
- **Setup:** [Quick Start](./docs/setup/QUICK-START.md), [Integration Setup](./docs/setup/INTEGRATION-SETUP.md)
- **Development:** [JS Standards](./docs/JS-STANDARDS.md), [TDD Guidelines](./docs/TDD-GUIDELINES.md)
- **Templates:** [Template Creation Guide](./docs/TEMPLATE-CREATION-GUIDE.md)
