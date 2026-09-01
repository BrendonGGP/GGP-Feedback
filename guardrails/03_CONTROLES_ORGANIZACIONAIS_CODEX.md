# Controles organizacionais para Codex

No Codex, uma política corporativa não deve existir apenas como texto. Distribua os controles em camadas:

| Objetivo | Mecanismo |
|---|---|
| Orientar comportamento global | `~/.codex/AGENTS.md` |
| Orientar o repositório | `AGENTS.md` e arquivos aninhados |
| Definir defaults locais | `config.toml` e perfis `*.config.toml` |
| Impedir que usuários enfraqueçam controles | `requirements.toml` |
| Bloquear ou solicitar aprovação por comando | `.rules` e regras administrativas |
| Reutilizar workflows | `.agents/skills/<nome>/SKILL.md` |
| Limitar extensões | allowlist de MCPs, skills e plugins |
| Autorizar efeitos de negócio | policy engine no backend |
| Comprovar execução | traces, logs, CI e evidência de código de saída |

## Baseline organizacional

- `danger-full-access` e `never` não são permitidos em máquinas corporativas normais.
- `--yolo` é proibido fora de runner isolado, descartável e sem credenciais amplas.
- Login shell é desativado por padrão.
- Rede de comandos é desativada por padrão.
- Web search ao vivo é desativada ou limitada por política.
- Leitura de secrets e arquivos sensíveis é negada pelo sandbox ou permissão administrativa.
- MCPs são negados por padrão e homologados por identidade.
- Skills não podem instalar dependências MCP automaticamente sem aprovação.
- Hooks não gerenciados são desativados em ambientes regulados.
- Alterações remotas, produção e dados sensíveis dependem de aprovação humana e backend.
- Toda ação mutável usa idempotência, limites e auditoria.

## Aplicação

Use `admin/requirements-modern.toml` para enforcement moderno e `admin/managed_config-modern.toml` para defaults. O `AGENTS.md` explica o comportamento esperado, mas o `requirements.toml` deve impedir configurações inseguras.
