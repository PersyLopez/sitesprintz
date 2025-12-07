# 🌳 Git Strategy

**Quick reference guide for daily git workflow.**

> 📚 **For comprehensive workflow documentation, see:** [Git Workflow Best Practices](./GIT-WORKFLOW-BEST-PRACTICES.md)

---

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

## ✅ Quick Workflows

### **Daily Development:**
```bash
git checkout dev
git checkout -b feature/my-feature
# ... work ...
git commit -m "feat: Your feature"
git push origin feature/my-feature
git checkout dev && git merge feature/my-feature && git push origin dev
```

### **Deploy to Staging:**
```bash
git checkout staging
git merge dev
git push origin staging
# Test on staging environment
```

### **Deploy to Production:**
```bash
git checkout main
git merge staging
git push origin main
# Auto-deploys to production
```

---

## ⚠️ Critical Rules

**DO:**
- ✅ Work on `dev` daily
- ✅ Test on `staging` before production
- ✅ Only merge to `main` from `staging`
- ✅ Use Pull Requests for code review

**DON'T:**
- ❌ Never commit directly to `main`
- ❌ Never commit directly to `staging`
- ❌ Never merge `dev` directly to `main` (skip staging)
- ❌ Never force push to `main` or `staging`

---

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: Add new feature
fix: Bug fix
docs: Documentation changes
refactor: Code restructure
test: Add tests
chore: Maintenance tasks
```

---

## 🔒 Branch Protection Setup

**Action Required:** Set up branch protection on GitHub:

1. Go to: https://github.com/PersyLopez/sitesprintz/settings/branches
2. **Protect `main` branch:**
   - ✅ Require pull request reviews
   - ✅ Require status checks to pass
   - ❌ Do not allow force pushes
   - ❌ Do not allow deletions
3. **Protect `staging` branch:**
   - ✅ Require pull request reviews
   - ❌ Do not allow force pushes

---

## 📚 Related Documentation

- [Git Workflow Best Practices](./GIT-WORKFLOW-BEST-PRACTICES.md) - Comprehensive guide
- [Quick Start](./QUICK-START.md) - Deployment guide
- [Contributing Guide](../../CONTRIBUTING.md) - Contribution guidelines

---

**Current Branch:** Run `git branch` to check  
**Switch Branch:** `git checkout <branch-name>`

**Remember:** `dev` → `staging` → `main` is the golden path! 🚀

