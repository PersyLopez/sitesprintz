# 🌳 Git Strategy

## Branch Structure

```
main (production)
  ↑ merge from staging only
staging (testing)
  ↑ merge from dev only
dev (daily work) ← Work here!
  ↑ merge feature branches
feature/* (new features)
```

---

## Workflows

### **New Feature:**
```bash
git checkout dev
git checkout -b feature/my-feature
# work...
git commit -m "feat: Add feature"
git push origin feature/my-feature
git checkout dev && git merge feature/my-feature
```

### **Deploy to Production:**
```bash
git checkout staging && git merge dev && git push
# Test on staging...
git checkout main && git merge staging && git push
# Deploys to production!
```

### **Emergency Hotfix:**
```bash
git checkout main
git checkout -b hotfix/critical
# fix...
git checkout main && git merge hotfix/critical && git push
# Merge to staging and dev too
```

---

## Rules

**DO:**
- ✅ Work on `dev` daily
- ✅ Test on `staging` before production
- ✅ Only merge to `main` from `staging`

**DON'T:**
- ❌ Never commit directly to `main`
- ❌ Never merge `dev` to `main`
- ❌ Never force push to `main`

---

## Commit Messages

```bash
feat: Add new feature
fix: Bug fix
docs: Documentation
refactor: Code restructure
test: Add tests
```

---

## Protection

1. Go to: https://github.com/PersyLopez/sitesprintz/settings/branches
2. Protect `main` branch
3. Require PR reviews

---

**Current Branch:** Run `git branch` to check  
**Switch Branch:** `git checkout <branch-name>`

