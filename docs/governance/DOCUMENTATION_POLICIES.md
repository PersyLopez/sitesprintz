# Documentation Policies

Governance rules for all contributors and AI agents working on SiteSprintz.

---

## Allowed Root Files

Only these markdown files may exist at the repository root:

| File | Purpose |
|------|---------|
| `README.md` | Project overview, quick start, status |
| `AGENTS.md` | Canonical AI assistant context |
| `CONTRIBUTING.md` | Contribution workflow |

All other documentation goes under `docs/`.

---

## Directory Placement

| Content type | Location | Naming |
|--------------|----------|--------|
| Architecture | `docs/ARCHITECTURE.md`, `docs/PROJECT_STRUCTURE.md` | Fixed names |
| Setup & deploy | `docs/setup/` | `UPPER-KEBAB.md` or descriptive |
| Development standards | `docs/development/` | Topic-based |
| Feature implementation | `docs/features/` | `FEATURE_NAME.md` |
| E-commerce | `docs/ecommerce/` | `ECOMMERCE_*.md` |
| Verification reports | `docs/verification/` | `*_VERIFICATION.md` |
| Test reports | `docs/reports/` | Descriptive |
| Security | `docs/security/` | Topic-based |
| Roadmap / backlog | `docs/plans/` | Descriptive |
| User guides | `docs/guides/` | Descriptive |
| Historical / completed | `docs/archive/` | **Read-only — no new files** |

---

## Agent Documentation Efficiency

**Agents must read** [`AGENT_DOCUMENTATION_GUIDE.md`](./AGENT_DOCUMENTATION_GUIDE.md) before creating docs.

- Default outcome of any task: **zero new markdown files**
- Routine testing, bug fixes, and refactors: **no new docs**
- Enforced by `.cursor/rules/documentation-efficiency.mdc` (always applied)

## Creating New Documentation

Only when the user requests docs, or durable reference is genuinely missing:

1. Check canonical table in [`docs/README.md`](../README.md) — **update existing doc first**
2. Place in the correct subfolder per table above
3. Add one line to folder `README.md` — never a secondary index
4. Add to canonical table in `docs/README.md` only for new primary references
5. Professional tone: tables, checklists — minimal emoji

---

## Forbidden Practices

- New markdown at repo root (except README, AGENTS, CONTRIBUTING)
- Duplicate reports covering the same topic
- Session summaries or "COMPLETE" status dumps outside `docs/archive/`
- Secrets, credentials, or real API keys in any doc
- Broken internal links after moving files

---

## One Doc Per Topic

Before creating a new document, check the **canonical doc** table in [`docs/README.md`](../README.md).
Update the existing canonical doc instead of writing a parallel report.

Each subfolder has a `README.md` listing its canonical docs. Do not create secondary index files.

## Migration Reference

| Archive | Contents |
|---------|----------|
| `archive/legacy-root/` | ~267 root-level markdown files (June 2026) |
| `archive/consolidated-2026/` | Redundant verification, ecommerce, and feature snapshots (June 2026) |

Search archives for historical context only — do not update archived files.

---

## Agent Checklist (Every Doc Change)

- [ ] File is in the correct `docs/` subfolder
- [ ] `docs/README.md` updated if this is a primary reference
- [ ] No new root-level markdown created
- [ ] Links use paths relative to `docs/` or repo root
- [ ] Tone is professional and actionable

---

**Enforced by**: `.cursor/rules/documentation-efficiency.mdc` (always), `.cursor/rules/documentation.mdc`, `AGENTS.md`
