---
name: project-hardening
description: Assess and improve the security hardening of a Codex-enabled project, including instructions, permissions, sandbox, command rules, secrets, network, MCPs, tools, RAG, CI/CD, approvals, rollback and incident response.
---

# Project hardening

1. Start with read-only inspection and read applicable `AGENTS.md`.
2. Build a threat model from observed assets, boundaries, identities, data, tools, MCPs, environments and pipelines.
3. Separate behavioral guidance, local execution controls, admin requirements, backend authorization/approvals, and CI/CD/operational controls.
4. Identify gaps by likelihood, impact, blast radius and exploitability using `references/hardening-checklist.md`.
5. Offer at least two viable options when tradeoffs are material.
6. Recommend a baseline with rollout, verification, rollback, ownership and residual risk.
7. Do not change configuration, enable network, install software, or access secrets unless explicitly requested and permitted.

