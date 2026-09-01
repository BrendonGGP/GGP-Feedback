# Mapeamento do pacote Claude para Codex

| Pacote anterior | Equivalente neste kit Codex |
|---|---|
| Instruções do Claude Project | `AGENTS.md` do repositório e `codex-home/AGENTS.md` global |
| `CLAUDE.md` | `AGENTS.md` |
| Comandos `.claude/commands` | Skills em `.agents/skills/<nome>/SKILL.md` |
| Configuração específica do Claude Code | `.codex/config.toml` e perfis em `codex-home/*.config.toml` |
| Restrições corporativas | `admin/requirements-modern.toml` ou `requirements-legacy.toml` |
| Proibição textual de comandos | `.codex/rules/default.rules` mais regras de `requirements.toml` |
| System prompt da API Claude | `02_SYSTEM_PROMPT_OPENAI_API.md` |
| Saída estruturada Claude | Responses API/Agents SDK com Pydantic ou JSON Schema |
| Configuração MCP em JSON | `mcp/mcp_servers.example.toml` |
| Política de tools | `06_POLITICA_FERRAMENTAS.yaml` e `examples/tool_policy_enforcer.py` |
| Filtros e verificador | Arquivos `10` a `14` |
| Red team | `16_TESTES_RED_TEAM.jsonl` e `examples/promptfoo.example.yaml` |

## Diferença essencial

`AGENTS.md` orienta. `config.toml` limita a sessão local. `requirements.toml` impõe controles administrativos. `.rules` controla comandos avaliados pelo execpolicy. Nenhuma dessas camadas substitui IAM, autorização por objeto, segregação por tenant, aprovação humana, sandbox de infraestrutura, egress, CI/CD ou confirmação no sistema de registro.

## Passos de migração

1. Remover referências a `CLAUDE.md` e `.claude/commands` do repositório.
2. Personalizar `AGENTS.md` com comandos reais de teste, lint, build e caminhos protegidos.
3. Escolher a configuração moderna ou legada conforme a versão da frota.
4. Copiar apenas skills revisadas para `.agents/skills`.
5. Homologar e allowlistar MCPs; não converter automaticamente todo servidor existente.
6. Executar os testes de formato, rules, tool policy e red team.
7. Fazer rollout em canário e validar rollback antes de ampliar.
