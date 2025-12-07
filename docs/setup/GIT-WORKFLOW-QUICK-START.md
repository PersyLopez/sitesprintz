# 🚀 Git Workflow Quick Start

## ⚠️ Important: We Just Pushed to Main Directly

**Current Status:** The last commit (`1caf85a6`) was pushed directly to `main`, which violates our workflow.

**Proper Workflow:** `dev` → `staging` → `main`

---

## 🔧 How to Fix This

### Option 1: Use the Fix Script (Recommended)

```bash
# Run the fix script
./scripts/fix-git-workflow.sh

# Follow the prompts to move the commit to dev properly
```

### Option 2: Manual Fix

```bash
# 1. Switch to dev branch
git checkout dev
git pull origin dev

# 2. Cherry-pick the commit from main
git cherry-pick 1caf85a6

# 3. Push to dev
git push origin dev

# 4. Reset main (if you want to remove the commit from main)
git checkout main
git reset --hard HEAD~1
git push origin main --force-with-lease
```

---

## ✅ Going Forward: Proper Workflow

### **Daily Development:**

```bash
# Always start from dev
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: Your feature description"

# Push feature branch
git push origin feature/your-feature-name

# Merge to dev (after review)
git checkout dev
git merge feature/your-feature-name
git push origin dev
```

### **Deploy to Staging:**

```bash
git checkout staging
git pull origin staging
git merge dev
git push origin staging
# Test on staging environment
```

### **Deploy to Production:**

```bash
# Only after staging tests pass!
git checkout main
git pull origin main
git merge staging
git push origin main
# Production auto-deploys
```

---

## 📋 Branch Protection Setup

**Action Required:** Set up branch protection on GitHub:

1. Go to: https://github.com/PersyLopez/sitesprintz/settings/branches
2. Add rule for `main`:
   - ✅ Require pull request reviews
   - ✅ Require status checks
   - ❌ Do not allow force pushes
   - ❌ Do not allow deletions
3. Add rule for `staging`:
   - ✅ Require pull request reviews
   - ❌ Do not allow force pushes

---

## 📚 Full Documentation

- [Git Workflow Best Practices](./docs/setup/GIT-WORKFLOW-BEST-PRACTICES.md)
- [Git Strategy](./docs/setup/GIT-STRATEGY.md)
- [Quick Start Guide](./docs/setup/QUICK-START.md)

---

**Remember:** Never commit directly to `main`! Always use `dev` → `staging` → `main` 🚀

