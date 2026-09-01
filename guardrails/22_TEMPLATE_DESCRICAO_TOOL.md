# Template de especificação segura de tool

## Identidade

- Nome estável: `{{TOOL_NAME}}`
- Owner: `{{OWNER}}`
- Finalidade: `{{PURPOSE}}`
- Sistema de registro: `{{SYSTEM_OF_RECORD}}`
- Efeito: `read | workspace_write | external_write | destructive`
- Risco: `L0 | L1 | L2 | L3 | L4`

## Contrato

- Input schema: JSON Schema rígido, sem propriedades extras.
- Output schema: JSON Schema rígido.
- Tenant e identidade: injetados pelo backend, nunca pelo modelo.
- Campos permitidos: `{{ALLOWED_FIELDS}}`
- Campos proibidos: `{{FORBIDDEN_FIELDS}}`
- Limites: `{{RATE_VOLUME_COST_LIMITS}}`
- Timeout: `{{TIMEOUT}}`
- Retry: no máximo `{{RETRY_LIMIT}}`
- Idempotência: `{{IDEMPOTENCY_RULE}}`

## Autorização

- Roles: `{{ROLES}}`
- Autorização por objeto: `{{RECORD_AUTHORIZATION}}`
- Aprovação: `{{APPROVAL_MODE}}`
- Escopo da aprovação: argumentos exatos, tenant, usuário, ambiente e validade.

## Segurança

- Allowlist de destino: `{{DESTINATIONS}}`
- Redaction de PII/secrets: `{{REDACTION}}`
- Proteção contra injection: `{{INJECTION_CONTROLS}}`
- Validação de URL/path: `{{URL_PATH_CONTROLS}}`
- Sandbox/rede/filesystem: `{{SANDBOX_CONTROLS}}`

## Side effects

- Preview obrigatório: `{{PREVIEW}}`
- Reversível: `{{REVERSIBILITY}}`
- Rollback: `{{ROLLBACK}}`
- Confirmação de sucesso: consultar `{{SYSTEM_OF_RECORD}}` após execução.
- Reconciliação parcial: `{{RECONCILIATION}}`

## Auditoria

Registrar request ID, usuário, tenant, tool version, policy version, argumentos redigidos, decisão, aprovação, resultado redigido, código de erro e confirmação do side effect.

## Testes mínimos

- schema inválido;
- role não autorizada;
- tenant divergente;
- objeto não autorizado;
- approval ausente, expirado ou reutilizado;
- argumentos alterados após aprovação;
- timeout e retry;
- idempotência;
- prompt injection no input e output;
- PII/secrets;
- side effect parcial;
- rate e volume limit.
