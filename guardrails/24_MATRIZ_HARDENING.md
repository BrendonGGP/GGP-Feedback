# Matriz de hardening para Codex

## Guardrail versus hardening

| Controle | Orientação ao modelo | Hardening efetivo |
|---|---|---|
| Não revelar secrets | `AGENTS.md` | secret fora do processo, env filtering e vault |
| Não escrever fora do projeto | prompt | sandbox e permission profile |
| Não executar comando destrutivo | prompt | `.rules` e `requirements.toml` |
| Pedir aprovação | instrução | token assinado e backend fail-closed |
| Não usar rede | instrução | network deny e egress allowlist |
| Não acessar outro tenant | instrução | RLS/ABAC no servidor |
| Não inventar teste | instrução | captura de comando e exit code |
| MCP somente leitura | descrição | credencial read-only e tools allowlisted |
| Não usar `--yolo` | orientação | allowed approval/sandbox profiles administrados |

## Níveis de maturidade

### Nível 0 — Prompt only

Somente instruções. Não adequado para dados sensíveis ou efeitos externos.

### Nível 1 — Sandbox local

`AGENTS.md`, `on-request`, `workspace-write`, rede negada e `.rules`.

### Nível 2 — Enforcement corporativo

`requirements.toml`, permission profiles, MCP allowlist, hooks gerenciados, IAM e logging central.

### Nível 3 — Policy-aware agent

Autorização por objeto, schemas rígidos, aprovação vinculada aos argumentos, idempotência, RAG tenant-scoped e verificador factual.

### Nível 4 — Operação resiliente

Canary, rollback testado, kill switch, reconciliação, red team contínuo, drift detection, SBOM e incident response.

## Baseline recomendado

- Desenvolvimento comum: Nível 1 + policy de tools.
- Dados pessoais ou sistemas internos: Nível 2 e 3.
- Financeiro, seguros, jurídico, saúde ou produção: Nível 3 e 4.

## Controles mínimos por superfície

### Codex local

- `approval_policy = "on-request"`
- `sandbox_mode = "workspace-write"` ou permission profile `:workspace`
- rede desativada
- login shell desativado
- history conforme política
- `.rules` e AGENTS aplicáveis

### MCP

- homologação, pin, hash e owner
- allowlist de tools
- approval mode por tool
- credencial mínima
- output filtering
- drift detection

### Backend

- autenticação e autorização fora do modelo
- tenant injetado pelo servidor
- approval token assinado
- idempotência e limites
- system-of-record confirmation

### CI/CD

- SAST, SCA, secrets, IaC, container, SBOM
- testes adversariais
- branch protection
- rollout e rollback
