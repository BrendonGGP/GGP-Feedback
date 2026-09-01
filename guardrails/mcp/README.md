# MCP no Codex

1. Homologue identidade, owner, finalidade, código, licença e dependências.
2. Fixe versão, commit ou imagem por digest.
3. Restrinja tools com `enabled_tools`.
4. Use `default_tools_approval_mode = "prompt"` como baseline.
5. Não coloque tokens em TOML; use `bearer_token_env_var` ou OAuth.
6. Execute stdio em sandbox/container sem rede e filesystem mínimo.
7. Filtre inputs e outputs contra prompt injection, secrets e PII.
8. Monitore drift de tools, descrições e schemas.
9. Use allowlist administrativa em `requirements.toml`.
10. Mantenha kill switch e revogação de credenciais.
