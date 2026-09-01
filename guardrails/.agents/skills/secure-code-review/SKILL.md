---
name: secure-code-review
description: Review a local diff, pull request, commit, or proposed code change for correctness, security, privacy, authorization, tenant isolation, regressions, supply-chain risk, and unverifiable claims. Use before completion of L2+ changes, for explicit security review, or when authentication, database, network, files, tools, MCPs, secrets, production, or external interfaces are affected. Review only; do not modify files.
---

# Secure code review

1. Read applicable `AGENTS.md` and review rules.
2. Inspect the exact diff and the minimum surrounding code needed to validate behavior.
3. Do not modify files, install dependencies, use destructive commands, or claim tests passed unless evidence is present.
4. Check the categories in `references/review-checklist.md`.
5. Report only findings with a plausible path and evidence. Avoid speculative vulnerability lists.
6. For each finding provide severity, file/location, observed evidence, impact, exploit or failure path, and a safe remediation.
7. Separate blockers from improvements and missing verification.
8. State when no material finding is supported, while listing checks not performed.
