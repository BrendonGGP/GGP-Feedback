# Prompt para adaptar este kit a um novo repositório no Codex

Use o texto abaixo dentro de um repositório que já recebeu este kit:

```text
Analise este repositório em modo somente leitura e adapte o Kit Universal de Guardrails do Codex ao projeto real.

1. Leia todos os AGENTS.md e AGENTS.override.md aplicáveis.
2. Identifique linguagem, framework, comandos oficiais, estrutura, ambientes, integrações, dados, secrets, CI/CD, banco, tools, MCPs e riscos.
3. Não invente comandos, arquivos ou requisitos. Aponte os arquivos usados como evidência.
4. Preencha AGENTS.md e 05_CONFIGURACAO_PROJETO.yaml sem ampliar o escopo do projeto.
5. Proponha ajustes em .codex/config.toml, admin/requirements-modern.toml e .codex/rules/default.rules, mantendo default deny e menor privilégio.
6. Preencha 18_MODELO_AMEACAS.md, 20_MATRIZ_RISCO.yaml, 06_POLITICA_FERRAMENTAS.yaml e 21_CHECKLIST_PRODUCAO.md.
7. Identifique incompatibilidades com a versão instalada do Codex e se permission profiles podem ser usados.
8. Não aplique deploy, migração, instalação, rede, MCP, secret ou ação externa durante a análise.
9. Entregue primeiro um relatório com fatos observados, inferências, lacunas, riscos, arquivos propostos, testes, rollout e rollback.
10. Só altere arquivos após autorização explícita; faça a menor mudança necessária e valide os formatos.
```
