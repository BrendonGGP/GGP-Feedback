---
name: secure-code-review
description: Review a local diff, pull request, commit, or proposed change for correctness, security, privacy, authorization, tenant isolation, regressions, supply-chain risk, and unverifiable claims.
---

# Secure code review

1. Read applicable `AGENTS.md` and review rules.
2. Inspect the exact diff and minimum surrounding code needed to validate behavior.
3. Do not modify files, install dependencies, use destructive commands, or claim tests passed without evidence.
4. Check `references/review-checklist.md`.
5. Report only findings with a plausible path and evidence.
6. For each finding provide severity, location, evidence, impact, failure path and safe remediation.
7. Separate blockers, improvements and missing verification.
8. State when no material finding is supported, while listing checks not performed.

