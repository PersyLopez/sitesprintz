#!/bin/bash
# Database Migration Runner
# Usage: ./run-migration.sh <migration-file.sql>

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not found in .env"
  exit 1
fi

# Check if migration file is provided
if [ -z "$1" ]; then
  echo "❌ ERROR: Please provide a migration file"
  echo "Usage: ./run-migration.sh migrations/your-migration.sql"
  exit 1
fi

# Check if file exists
if [ ! -f "$1" ]; then
  echo "❌ ERROR: File not found: $1"
  exit 1
fi

# Run the migration
echo "🚀 Running migration: $1"
echo "📍 Database: $(echo $DATABASE_URL | sed 's/:[^:]*@/@/g')"  # Hide password
echo ""

psql "$DATABASE_URL" -f "$1"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi

