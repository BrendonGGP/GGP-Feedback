# Hardening checklist

- AGENTS hierarchy and size.
- on-request/untrusted approvals.
- read-only/workspace permissions; no danger-full-access.
- network deny, login shell off, secret env filtering.
- `.rules` and admin `requirements.toml`.
- protected path read denials.
- MCP identity, tool allowlist, approval mode, pin and drift.
- skill/plugin provenance and dependency installs.
- backend identity, tenant, record authorization and approvals.
- RAG source authorization and injection filtering.
- SAST, SCA, secret, IaC, container scans and SBOM.
- traces, redaction, alerts, kill switch and incident response.
- canary, rollback and reconciliation.
