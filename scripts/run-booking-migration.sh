#!/bin/bash
# Run booking system migration

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set"
  echo "Please set DATABASE_URL in your .env file"
  exit 1
fi

echo "🗄️  Running Booking System Phase 1 Migration..."
psql "$DATABASE_URL" -f database/migrations/001_booking_system_phase1.sql

echo "✅ Migration complete!"

