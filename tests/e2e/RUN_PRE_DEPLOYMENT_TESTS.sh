#!/bin/bash

# Pre-Deployment E2E Test Runner
# Ensures all critical functionality works before deployment

set -e

echo "🚀 Pre-Deployment E2E Test Suite"
echo "=================================="
echo ""

# Check if server is running
echo "📡 Checking if server is running..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running. Please start it with: npm run dev:backend"
    exit 1
fi

# Check if database is seeded
echo "🗄️  Checking database state..."
if [ -f "tests/setup/seed-test-data.js" ]; then
    echo "ℹ️  Database seeding script found. Run 'node tests/setup/seed-test-data.js' if needed."
else
    echo "⚠️  Database seeding script not found"
fi

echo ""
echo "🧪 Running pre-deployment tests..."
echo ""

# Run the tests
npx playwright test tests/e2e/pre-deployment-comprehensive.spec.js "$@"

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All pre-deployment tests passed!"
    echo "✅ Ready for deployment"
    exit 0
else
    echo ""
    echo "❌ Some tests failed. Review the output above."
    echo "❌ Do not deploy until all tests pass."
    exit 1
fi
