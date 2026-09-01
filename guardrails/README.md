# Kit Universal de Guardrails e Hardening para OpenAI Codex

Versão do kit: **1.0.0**  
Baseline revisado em: **27 de agosto de 2026**

Este pacote adapta o kit universal anterior aos formatos do Codex e acrescenta controles técnicos que não devem depender somente do comportamento do modelo.

> O modelo propõe. O schema valida. A política autoriza. O sandbox limita. A ferramenta executa. O sistema de registro confirma. O log comprova.

## O que o pacote protege

- alucinação e afirmações sem evidência;
- falsa confirmação de testes, deploys e tool calls;
- prompt injection direta e indireta;
- exposição de secrets, PII e dados entre tenants;
- execução de comandos destrutivos;
- permissões excessivas de filesystem e rede;
- tools, apps, plugins, skills e MCPs não homologados;
- alteração remota, produção e efeitos de negócio sem aprovação;
- supply chain, drift, dependências e scripts de instalação;
- falhas sem auditoria, rollback ou resposta a incidente.

## Camadas de controle

| Camada | Arquivos | Função |
|---|---|---|
| Instruções | `AGENTS.md`, `codex-home/AGENTS.md` | Orientar comportamento e processo |
| Sandbox local | `.codex/config.toml`, `codex-home/*.config.toml` | Limitar filesystem, rede, ambiente e extensões |
| Execpolicy | `.codex/rules/default.rules` | Permitir, solicitar aprovação ou bloquear comandos |
| Enforcement administrativo | `admin/requirements-*.toml` | Impedir que controles sejam enfraquecidos |
| Política da aplicação | arquivos `05` a `15` | Autorizar fontes, tools, MCPs, tenants e aprovações |
| Hardening operacional | arquivos `17` a `24` | Threat model, incidentes, produção, rollout e rollback |
| Evals | `16_TESTES_RED_TEAM.jsonl`, `promptfoo.example.yaml` | Detectar regressões e ataques |
| Implementação | `examples/` | Exemplos de API, Agents SDK, Codex SDK e policy engine |

## Instalação rápida no repositório

Copie para a raiz do projeto:

```text
AGENTS.md
.codex/config.toml
.codex/rules/default.rules
.agents/skills/
05_CONFIGURACAO_PROJETO.yaml
06_POLITICA_FERRAMENTAS.yaml
07_POLITICA_MCP.yaml
08_POLITICA_RAG.md
15_POLITICA_APROVACAO_HUMANA.yaml
```

Depois:

1. substitua os campos `{{...}}` pelos dados reais;
2. configure os comandos reais de teste, lint, type check e build no `AGENTS.md`;
3. valide a versão do Codex instalada;
4. escolha o arquivo moderno ou legado, nunca ambos na mesma cadeia ativa;
5. teste as rules antes de liberar alterações.

## Configuração moderna e legada

### Codex 0.138.0 ou posterior

Use:

```text
.codex/config.toml
admin/requirements-modern.toml
admin/managed_config-modern.toml
```

O baseline moderno usa `default_permissions` e um permission profile customizado. Permission profiles estão em beta e precisam ser validados na versão implantada.

### Clientes legados

Use:

```text
.codex/config.legacy.toml
admin/requirements-legacy.toml
admin/managed_config-legacy.toml
codex-home/config.legacy.toml
```

Não combine `default_permissions`/`[permissions]` com `sandbox_mode`/`[sandbox_workspace_write]` na mesma cadeia de configuração.

## Configuração global do usuário

Copie o conteúdo de `codex-home/` para `~/.codex/`:

```text
~/.codex/
├── AGENTS.md
├── config.toml
├── audit.config.toml
├── implementation.config.toml
└── rules/
    └── default.rules
```

Perfis:

```bash
codex --profile audit
codex --profile implementation
```

O perfil `audit` é somente leitura. O perfil `implementation` permite escrita no workspace com rede desligada, secrets negados e aprovações sob demanda.

## Administração corporativa

`requirements.toml` deve ser tratado como enforcement. O arquivo moderno:

- permite apenas aprovação `on-request` revisada pelo usuário;
- nega `:danger-full-access` e o built-in `:workspace` direto;
- permite `:read-only` e o perfil corporativo customizado;
- aplica deny-read a secrets;
- desliga rede no perfil corporativo;
- desativa plugins, catálogo remoto, memories, multi-agent, hooks não gerenciados e instalação automática de dependências MCP;
- mantém uma allowlist MCP vazia até homologação;
- bloqueia ou exige aprovação para comandos sensíveis.

Use `admin/requirements-with-approved-mcp.example.toml` somente como referência para servidores já homologados.

## Skills Codex incluídas

- `safe-preflight`: preflight somente leitura e classificação L0–L4;
- `secure-code-review`: revisão de código baseada em evidência;
- `project-hardening`: auditoria de configurações, blast radius, IAM, MCPs, CI/CD e operação.

As skills estão em `.agents/skills/` e também são entregues individualmente em `dist/skills/` após a validação do pacote.

## Uso com Responses API e Agents SDK

- use `02_SYSTEM_PROMPT_OPENAI_API.md` como instruções de sistema;
- use `09_SCHEMA_RESPOSTA.json` ou modelos Pydantic equivalentes;
- execute o filtro `10` antes do agente principal;
- trate documentos, páginas e tool results com o filtro `12`;
- execute o verificador factual `13` contra o conjunto de evidências;
- valide tool calls no backend com identidade, tenant, schema, autorização por objeto, approval e idempotência;
- não confie no modelo como árbitro final da própria permissão.

Exemplos:

```text
examples/python_openai_guarded.py
examples/python_agents_sdk_guardrails.py
examples/python_codex_sdk_guarded.py
examples/tool_policy_enforcer.py
```

## MCPs

O baseline administrativo contém `[mcp_servers]` vazio, que representa allowlist vazia. Antes de permitir um MCP:

1. identificar owner e finalidade;
2. revisar código, licença e dependências;
3. fixar versão, commit ou imagem por digest;
4. registrar hash e SBOM;
5. restringir tools e approval mode;
6. separar leitura de escrita;
7. usar credencial de menor privilégio;
8. limitar filesystem e rede;
9. filtrar input e output contra injection, PII e secrets;
10. monitorar drift e manter kill switch.

## Hardening

O arquivo `17_HARDENING_CODEX.md` distingue controles comportamentais de barreiras técnicas. O baseline inclui:

- permission profiles ou sandbox legado;
- rede deny por padrão;
- env filtering e deny-read de secrets;
- rules locais e administrativas;
- plugins/MCPs desabilitados por padrão;
- approval vinculada a argumentos exatos;
- idempotência e autorização por tenant;
- SAST, SCA, secret scan, IaC, container scan e SBOM;
- observabilidade, canário, rollback, kill switch e incident response.

## Validação

Execute:

```bash
python3 scripts/validate_package.py
python3 scripts/check_placeholders.py
python3 -m unittest discover -s tests -v
python3 .agents/skills/project-hardening/scripts/audit_codex_config.py \
  .codex/config.toml \
  codex-home/config.toml \
  admin/requirements-modern.toml
```

Quando o Codex CLI estiver instalado:

```bash
bash scripts/test_execpolicy.sh
```

O script usa `codex execpolicy check` contra casos permitidos, sujeitos a prompt e proibidos.

## Estrutura dos arquivos

- `00`: prompt mestre universal;
- `01`: instruções globais para `~/.codex/AGENTS.md`;
- `02`: system prompt para API;
- `03`: mapeamento de enforcement organizacional;
- `05`–`15`: configuração, tools, MCP, RAG, schemas, filtros, verificação e aprovação;
- `16`: red team;
- `17`–`24`: hardening, threat model, incidente, risco, produção, tools e implantação;
- `25`: migração Claude → Codex;
- `.codex/`: config e rules do projeto;
- `codex-home/`: config global e perfis;
- `admin/`: requirements e managed defaults;
- `.agents/skills/`: workflows reutilizáveis;
- `mcp/`: exemplos e registro de homologação;
- `examples/`: implementações de referência;
- `scripts/` e `tests/`: validação e regressão;
- `references/SOURCES_OFFICIAL.md`: documentação oficial consultada.

## Limites importantes

- Guardrails não garantem zero alucinação.
- Structured Outputs garante formato, não verdade factual.
- `AGENTS.md` é orientação, não uma barreira de segurança.
- `.rules` não substitui sandbox, IAM ou autorização de negócio.
- Aprovação apresentada pelo modelo não é uma aprovação válida.
- Configurações do Codex evoluem; valide sintaxe e comportamento na versão implantada.
