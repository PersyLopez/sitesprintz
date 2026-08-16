# Agent Documentation Guide

Instructions for AI agents: write **essential documentation only**, in the **correct place**, without creating redundancy.

---

## Golden Rule

> **If the user did not ask for documentation, prefer code + tests + a chat summary. Do not create markdown files.**

Most tasks end with zero new doc files.

---

## Decision Tree

```
User asked for docs?
├─ NO → Stop. No new markdown unless legally required for the task.
└─ YES → Does a canonical doc already cover this topic?
    ├─ YES → Update that doc. Do not create a parallel file.
    └─ NO → Is this durable reference material (setup, architecture, feature design)?
        ├─ NO → Put answer in chat only.
        └─ YES → Create ONE doc in the correct subfolder.
```

---

## What Counts as Essential

| Essential (may document) | Not essential (do not document) |
|--------------------------|----------------------------------|
| Setup steps that repeat across sessions | "I ran tests and they passed" |
| Architecture or data-flow changes | Session summaries |
| Feature implementation guides (one per feature) | Duplicate verification reports |
| API contracts not obvious from code | `*_COMPLETE.md` status dumps |
| Security or deployment checklists | Per-task analysis reports |
| User-requested guides | Auto-generated indexes |

---

## Canonical Docs — Update, Don't Duplicate

Before creating any file, check [`docs/README.md`](../README.md) **Canonical Docs** table and the relevant folder `README.md`.

| Topic | Update this file |
|-------|------------------|
| Feature status | `features/QUICK_REFERENCE_STATUS.md` |
| Page builder | `features/PLUG_AND_PLAY_IMPLEMENTATION.md` |
| E-commerce | `ecommerce/ECOMMERCE_TESTING_GUIDE.md` or `ECOMMERCE_TIER_CONSOLIDATION.md` |
| Site creation | `verification/SITE_CREATION_PROCESS_VERIFICATION.md` |
| Local setup | `setup/QUICK-START.md` |
| JS conventions | `development/JS-STANDARDS.md` |
| Architecture | `docs/ARCHITECTURE.md` |
| Agent behavior | `AGENTS.md` |

---

## Forbidden File Patterns

Do **not** create files matching these patterns unless the user explicitly requests them:

- `*_COMPLETE.md`, `*_SUMMARY.md`, `*_REPORT.md`
- `*_VERIFICATION.md` (after routine testing — update canonical doc instead)
- `DOCUMENTATION_INDEX.md`, `*_DOCUMENTATION_INDEX.md`
- `QUICK_REFERENCE_*.md` (unless extending an existing quick-ref family)
- `PROJECT_FINAL_*.md`, `FULL_PROJECT_*.md`
- `MANUAL_TESTING_REPORT.md`, `TESTING_SUMMARY.md`
- Anything at repo root except `README.md`, `AGENTS.md`, `CONTRIBUTING.md`
- Anything under `docs/archive/`

---

## Placement

| Content | Location |
|---------|----------|
| Setup / deploy / OAuth | `docs/setup/` |
| Coding standards | `docs/development/` |
| Feature guides | `docs/features/` |
| E-commerce | `docs/ecommerce/` |
| Policies | `docs/governance/` |
| Roadmap | `docs/plans/` |

**Indexes**: `docs/README.md` is the only project-wide index. Subfolders use `README.md` only — never add a second index file.

---

## After Code Changes (Default Workflow)

1. **Bug fix** → test only; no doc
2. **Small feature** → update existing feature doc if behavior changed
3. **New feature** → one implementation doc in `docs/features/` + update `QUICK_REFERENCE_STATUS.md` + folder `README.md` + canonical table in `docs/README.md`
4. **Refactor** → update `ARCHITECTURE.md` only if structure changed
5. **Manual test pass** → report in chat; update verification doc only if flows changed
6. **Setup change** → update `docs/setup/QUICK-START.md` or relevant setup doc
7. **E-commerce change** → update `docs/ecommerce/ECOMMERCE_TESTING_GUIDE.md` or `ECOMMERCE_TIER_CONSOLIDATION.md`
8. **Site creation change** → update `docs/verification/SITE_CREATION_PROCESS_VERIFICATION.md`

---

## Agent Checklist

Before creating or significantly editing documentation:

- [ ] User requested docs, OR this is durable reference material
- [ ] Checked canonical doc table — updating existing file instead
- [ ] Correct subfolder chosen
- [ ] Not creating an index, summary, or completion report
- [ ] Not writing to repo root or `docs/archive/`
- [ ] Folder `README.md` updated (one line) if adding a primary doc
- [ ] `docs/README.md` canonical table updated only for new primary references

---

## Enforcement

- `.cursor/rules/documentation-efficiency.mdc` — always applied
- `.cursor/rules/documentation.mdc` — when editing `docs/**`
- `AGENTS.md` — agent context
- [`DOCUMENTATION_POLICIES.md`](./DOCUMENTATION_POLICIES.md) — full policies

---

**Version**: 1.0 | June 2026
