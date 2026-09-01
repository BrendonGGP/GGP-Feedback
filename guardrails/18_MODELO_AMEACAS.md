# Template universal de modelo de ameaças para IA/Codex

## 1. Sistema

- Nome: `{{PROJECT_NAME}}`
- Objetivo: `{{PROJECT_PURPOSE}}`
- Proprietário: `{{OWNER}}`
- Dados processados: `{{DATA_TYPES}}`
- Usuários e papéis: `{{ROLES}}`
- Ambientes: `{{ENVIRONMENTS}}`
- Tools, MCPs e integrações: `{{INTEGRATIONS}}`

## 2. Fronteiras de confiança

Documente:

- usuário -> aplicação;
- aplicação -> modelo;
- modelo -> tool gateway;
- gateway -> serviços internos/externos;
- ingestão -> índice/RAG;
- CI/CD -> produção;
- Codex local -> filesystem/rede;
- MCP -> recursos e credenciais.

Para cada fronteira, informe autenticação, autorização, criptografia, schema, limites e logs.

## 3. Ativos críticos

- secrets e credenciais;
- código-fonte e propriedade intelectual;
- dados pessoais e regulados;
- dados de cada tenant;
- sistemas transacionais;
- infraestrutura e produção;
- políticas, prompts e regras;
- trilha de auditoria;
- reputação e comunicações externas.

## 4. Ameaças mínimas

| ID | Ameaça | Entrada/ator | Impacto | Controle preventivo | Detecção | Risco residual |
|---|---|---|---|---|---|---|
| T01 | Alucinação factual | Modelo | Decisão incorreta | RAG, citações, verificador, abstinência | claim evals | {{RISK}} |
| T02 | Prompt injection direta | Usuário | Bypass de regras | filtro, hierarquia, tool policy | alertas | {{RISK}} |
| T03 | Injection indireta | Documento/MCP | Exfiltração/execução | sanitização, sandbox, menor privilégio | scanning/drift | {{RISK}} |
| T04 | Cross-tenant | Usuário/tool/RAG | Vazamento | tenant no backend, RLS, índice segregado | canários/auditoria | {{RISK}} |
| T05 | Secret exfiltration | Prompt/comando | Comprometimento | deny-read, env filtering, DLP | secret scan | {{RISK}} |
| T06 | Excessive agency | Tool/MCP | Side effect indevido | default deny, aprovação, scopes | tool audit | {{RISK}} |
| T07 | Command injection | Conteúdo externo | RCE | sem shell interpolation, rules, sandbox | EDR/logs | {{RISK}} |
| T08 | Supply-chain | Skill/MCP/pacote | Código malicioso | pin/hash/SBOM/review | SCA/drift | {{RISK}} |
| T09 | Approval spoofing/replay | Usuário/modelo | Ação crítica | token assinado, hash, TTL, uso único | replay alerts | {{RISK}} |
| T10 | Resultado de tool falsificado | Usuário/modelo | Confirmação falsa | canal autenticado, schema, correlation ID | inconsistência | {{RISK}} |
| T11 | Disponibilidade/custo | Loop/ataque | DoS/custo | rate/timeout/budget/circuit breaker | métricas | {{RISK}} |
| T12 | Log leakage | Observabilidade | Vazamento persistente | redaction/retention/access control | DLP | {{RISK}} |

## 5. Casos de abuso

Para cada tool, descreva:

- uso legítimo;
- uso indevido previsível;
- pré-condições;
- volume máximo;
- efeito externo;
- reversibilidade;
- aprovação;
- rollback;
- sinal de detecção.

## 6. Critérios de aceite de segurança

- zero leitura de secrets em testes adversariais;
- zero acesso cross-tenant;
- zero tool call mutável sem aprovação válida;
- zero alegação falsa de execução;
- nenhuma saída factual material sem evidência quando grounding for obrigatório;
- rollback testado para mudanças L3/L4;
- logs suficientes para reconstruir o incidente sem armazenar PII desnecessária.

## 7. Revisão

Atualize o modelo de ameaças quando mudar modelo, prompt, RAG, tool, MCP, skill, dependência, permissão, tenant model, ambiente, pipeline ou classificação de dados.
