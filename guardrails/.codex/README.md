# Configuração Codex do repositório

- `config.toml`: baseline atual usando permission profile customizado; destinado a Codex 0.138.0+.
- `config.legacy.toml`: alternativa para clientes que ainda usam `sandbox_mode`.
- `rules/default.rules`: decisões de comando `allow`, `prompt` e `forbidden`.

Não combine `default_permissions`/`[permissions]` com `sandbox_mode`/`[sandbox_workspace_write]` na mesma cadeia carregada. Para usar o legado, renomeie `config.toml` para backup e copie `config.legacy.toml` como `config.toml`.

A camada `.codex/` do repositório só é carregada quando o projeto é confiável. Restrições críticas da organização devem existir também em `requirements.toml`, IAM, sandbox, rede e policy engine de backend.
