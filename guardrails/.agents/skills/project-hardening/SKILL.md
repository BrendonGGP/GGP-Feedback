---
name: project-hardening
description: Assess and improve the security hardening of a Codex-enabled project, including AGENTS.md, config.toml, permission profiles, sandbox, requirements.toml, command rules, secrets, network, MCPs, skills, plugins, tools, RAG, CI/CD, observability, approvals, rollback, and incident response. Use when the user asks for hardening, guardrails, blast-radius reduction, secure Codex setup, production readiness, or architecture security. Analyze read-only by default.
---

# Project hardening

1. Start with read-only inspection and read applicable `AGENTS.md`.
2. Run `scripts/audit_codex_config.py` on discovered Codex TOML files when Python is available.
3. Build a threat model from observed assets, boundaries, identities, data, tools, MCPs, environments and pipelines.
4. Separate:
   - behavioral guidance;
   - local sandbox and execution controls;
   - admin-enforced requirements;
   - backend authorization and approvals;
   - CI/CD and operational controls.
5. Identify gaps by likelihood, impact, blast radius and exploitability.
6. Offer at least two viable hardening options when tradeoffs are material.
7. Recommend a baseline with rollout, verification, rollback, ownership and residual risk.
8. Do not change configuration, enable network, install software, or access secrets unless the user explicitly requests implementation and policy permits it.
9. Use `references/hardening-checklist.md` for coverage.
