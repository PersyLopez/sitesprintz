#!/bin/bash

# Fix Git Workflow - Move commits from main to dev properly
# This script helps fix when commits are made directly to main

set -e

echo "🔧 Git Workflow Fix Script"
echo "=========================="
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Get the last commit hash
LAST_COMMIT=$(git log -1 --oneline | cut -d' ' -f1)
echo "Last commit: $LAST_COMMIT"
echo ""

# Check if we're on main
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Not on main branch. Please run this from main."
    exit 1
fi

echo "This will:"
echo "1. Cherry-pick the last commit to dev branch"
echo "2. Reset main to remove the commit (keeping changes)"
echo "3. Show you how to properly merge dev → staging → main"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Ensure dev branch exists locally
if ! git show-ref --verify --quiet refs/heads/dev; then
    echo "Creating dev branch from origin/dev..."
    git checkout -b dev origin/dev 2>/dev/null || git checkout -b dev
fi

# Switch to dev
echo "Switching to dev branch..."
git checkout dev

# Pull latest dev
echo "Pulling latest dev..."
git pull origin dev || echo "No remote dev branch, continuing..."

# Cherry-pick the commit
echo "Cherry-picking commit $LAST_COMMIT to dev..."
git cherry-pick $LAST_COMMIT

echo ""
echo "✅ Commit moved to dev branch!"
echo ""
echo "Next steps:"
echo "1. Review the commit on dev: git log --oneline -1"
echo "2. Push dev: git push origin dev"
echo "3. Merge to staging: git checkout staging && git merge dev && git push origin staging"
echo "4. After testing, merge to main: git checkout main && git merge staging && git push origin main"
echo ""
echo "To undo this fix, run:"
echo "  git checkout main"
echo "  git reset --hard origin/main"
echo ""







