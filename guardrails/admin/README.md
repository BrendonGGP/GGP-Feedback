# Configuração administrativa do Codex

## Arquivos

- `requirements-modern.toml`: enforcement para Codex 0.138.0+ com `allowed_permission_profiles` e perfil customizado.
- `requirements-legacy.toml`: compatibilidade com `allowed_sandbox_modes`.
- `managed_config-modern.toml`: defaults de inicialização para a frota moderna.
- `managed_config-legacy.toml`: defaults para clientes legados.
- `requirements-with-approved-mcp.example.toml`: exemplo separado de allowlist MCP.

## Regras de implantação

1. Faça inventário das versões instaladas antes de escolher moderno ou legado.
2. Não combine `default_permissions`/`[permissions]` com `sandbox_mode` na mesma cadeia ativa.
3. Distribua `requirements.toml` por MDM, imagem corporativa ou mecanismo gerenciado suportado.
4. Valide em canário, confirme o fallback do cliente e mantenha rollback.
5. O baseline moderno deixa a allowlist `[mcp_servers]` vazia; portanto nenhum MCP é permitido até homologação.
6. Requisitos de Codex não substituem IAM, autorização por objeto, segregação por tenant, egress de rede, CI/CD ou aprovação de negócio.

No Linux/macOS, um local administrativo comum é `/etc/codex/requirements.toml`. No Windows, use a localização gerenciada indicada pela documentação e pela sua ferramenta de administração.
