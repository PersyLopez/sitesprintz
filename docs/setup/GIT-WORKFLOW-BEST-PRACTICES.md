# 🌳 Git Workflow Best Practices

## Branch Structure

```
main (production) ← Protected, only merges from staging
  ↑
staging (testing/pre-production) ← Only merges from dev
  ↑
dev (development) ← Daily work happens here
  ↑
feature/* (feature branches) ← New features branch from dev
```

---

## ✅ Correct Workflow

### **1. Daily Development Work**

```bash
# Start from dev branch
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/frontend-ux-improvements

# Make changes and commit
git add .
git commit -m "feat: Add mobile menu and improved accessibility"

# Push feature branch
git push origin feature/frontend-ux-improvements

# Merge back to dev (after review/testing)
git checkout dev
git merge feature/frontend-ux-improvements
git push origin dev
```

### **2. Deploy to Staging (Testing)**

```bash
# Merge dev → staging
git checkout staging
git pull origin staging
git merge dev
git push origin staging

# Staging environment auto-deploys
# Test thoroughly on staging environment
```

### **3. Deploy to Production**

```bash
# Only after staging tests pass!
git checkout main
git pull origin main
git merge staging
git push origin main

# Production auto-deploys
```

---

## ❌ Common Mistakes to Avoid

### **NEVER:**
- ❌ Commit directly to `main`
- ❌ Commit directly to `staging`
- ❌ Merge `dev` directly to `main` (skip staging)
- ❌ Force push to `main` or `staging`
- ❌ Work on `main` branch

### **ALWAYS:**
- ✅ Work on `dev` or feature branches
- ✅ Test on `staging` before production
- ✅ Use Pull Requests for code review
- ✅ Write descriptive commit messages
- ✅ Keep branches up to date

---

## 🔄 Fixing Mistakes

### **If you committed to main by mistake:**

```bash
# 1. Create a revert commit
git checkout main
git revert <commit-hash>
git push origin main

# 2. Move the work to dev properly
git checkout dev
git cherry-pick <commit-hash>
git push origin dev

# 3. Follow proper workflow from dev → staging → main
```

### **If you need to move commits:**

```bash
# Move last commit from main to dev
git checkout dev
git cherry-pick main
git checkout main
git reset --hard HEAD~1
git push origin main --force-with-lease  # Only if necessary!
```

---

## 📋 Branch Protection Setup

### **GitHub Branch Protection Rules**

1. Go to: `https://github.com/PersyLopez/sitesprintz/settings/branches`

2. **Protect `main` branch:**
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Restrict pushes to matching branches
   - ✅ Allow force pushes: ❌ NO
   - ✅ Allow deletions: ❌ NO

3. **Protect `staging` branch:**
   - ✅ Require pull request reviews
   - ✅ Allow force pushes: ❌ NO

4. **Allow `dev` branch:**
   - ⚠️ Less restrictions (for daily work)
   - ✅ Still require PRs for large changes

---

## 🚨 Emergency Hotfix Workflow

For critical production bugs:

```bash
# 1. Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Fix the bug
# ... make changes ...
git add .
git commit -m "fix: Critical bug fix"

# 3. Merge to main (after testing)
git checkout main
git merge hotfix/critical-bug-fix
git push origin main

# 4. Merge back to staging and dev
git checkout staging
git merge main
git push origin staging

git checkout dev
git merge main
git push origin dev

# 5. Delete hotfix branch
git branch -d hotfix/critical-bug-fix
git push origin --delete hotfix/critical-bug-fix
```

---

## 📝 Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### **Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### **Examples:**
```bash
feat(header): Add mobile hamburger menu
fix(auth): Resolve login validation issue
docs(readme): Update deployment instructions
refactor(api): Simplify error handling
```

---

## 🔍 Useful Commands

### **Check Current Branch:**
```bash
git branch
git status
```

### **See Branch Differences:**
```bash
git log dev..main          # Commits in main not in dev
git log main..dev          # Commits in dev not in main
git diff dev..main         # File differences
```

### **Clean Up Branches:**
```bash
# Delete local merged branches
git branch --merged | grep -v "\*\|main\|dev\|staging" | xargs -n 1 git branch -d

# Delete remote merged branches
git branch -r --merged | grep -v "main\|dev\|staging" | sed 's/origin\///' | xargs -n 1 git push origin --delete
```

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Start new feature | `git checkout dev && git checkout -b feature/name` |
| Daily work | `git checkout dev` |
| Deploy to staging | `git checkout staging && git merge dev && git push` |
| Deploy to production | `git checkout main && git merge staging && git push` |
| Check what branch | `git branch` |
| See uncommitted changes | `git status` |
| See commit history | `git log --oneline --graph --all` |

---

## 📚 Related Documentation

- [Git Strategy](./GIT-STRATEGY.md) - Quick reference guide
- [Git Workflow Quick Start](./GIT-WORKFLOW-QUICK-START.md) - Quick reference
- [Quick Start](./QUICK-START.md) - Deployment guide
- [Contributing Guide](../../CONTRIBUTING.md) - Contribution guidelines

---

## 🔧 Fix Script

If you accidentally commit to `main`, use the fix script:

```bash
./scripts/fix-git-workflow.sh
```

This will automatically move commits from `main` to `dev` properly.

---

**Remember:** `dev` → `staging` → `main` is the golden path! 🚀

