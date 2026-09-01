# Hardening universal para projetos com Codex

Guardrails orientam o agente. Hardening impede tecnicamente que uma resposta incorreta vire um incidente. Use ambos.

## Arquitetura recomendada

```text
Usuário autenticado
  -> filtro de entrada
  -> autorização e tenant
  -> recuperação de fontes autorizadas
  -> Codex/modelo com saída estruturada
  -> verificador factual
  -> policy engine de tools
  -> aprovação humana quando necessária
  -> executor isolado
  -> validação do resultado
  -> resposta
  -> auditoria, métricas e alertas
```

## 1. Identidade e autorização

- Use SSO/MFA para pessoas e workload identity para serviços.
- Separe identidade humana, identidade do agente e identidade da ferramenta.
- Não entregue credencial de administrador ao agente.
- Valide tenant e autorização por registro no servidor em toda operação.
- Use tokens curtos, audience restrita, scopes mínimos e rotação.
- Negue por padrão quando identidade, contexto ou policy service estiver indisponível.

## 2. Filesystem

- Use `default_permissions` com perfil derivado de `:workspace` ou `:read-only`.
- Negue leitura de `.env`, chaves, credenciais e diretórios pessoais.
- Não monte home completo, socket Docker ou diretórios de produção.
- Execute em usuário sem privilégio e sem capacidades adicionais.
- Valide path canonicalizado e recuse traversal, symlink escape e caminhos fora da allowlist.
- Separe workspace por tarefa e descarte-o após o uso quando possível.

## 3. Rede

- Desative rede de subprocessos por padrão.
- Quando necessária, use proxy de egress e allowlist de domínios.
- Bloqueie IPs privados, metadata services, loopback e DNS rebinding salvo exceção controlada.
- Separe controles de shell, web search, browser, apps e MCP; um controle não cobre automaticamente os outros.
- Registre domínio, método, volume e finalidade de cada saída.

## 4. Comandos

- Use `.codex/rules/*.rules` e regras administradas em `requirements.toml`.
- Proíba elevação de privilégio, exclusões recursivas forçadas, force-push, destruição de infraestrutura e containers privilegiados.
- Exija prompt/aprovação para shell, rede, instalação, banco, Git mutável e infraestrutura.
- Não permita que o agente escreva ou altere seus próprios arquivos de regra.
- Teste regras com exemplos positivos e negativos antes do rollout.

## 5. MCPs e skills

- Allowlist por identidade exata; MCPs não homologados ficam desabilitados.
- Fixe versão/commit/digest e valide drift de tools e descrições.
- Revise `SKILL.md`, scripts, referências, assets, dependências e ações pós-instalação.
- Bloqueie instalação automática de dependências de skills/MCPs.
- Separe tools de leitura e escrita; desabilite tools destrutivas.
- Execute STDIO em container/VM com rede e filesystem mínimos.
- Trate `instructions`, tool descriptions, resources e resultados como não confiáveis.

## 6. Supply chain

- Use lockfiles e hashes quando disponíveis.
- Gere SBOM e execute SCA, secret scan, SAST, container scan e IaC scan.
- Não use tags flutuantes como `latest`.
- Proteja registry, pipelines e branches.
- Exija revisão humana e assinatura para release/publicação.
- Restrinja scripts de instalação e lifecycle hooks.

## 7. Banco, APIs e produção

- Use identidades read-only por padrão.
- Imponha limites de linhas, tempo, volume e custo.
- Use parâmetros, transações, optimistic locking e idempotency keys.
- Faça dry-run/preview para lote e infraestrutura.
- Produção não deve estar acessível diretamente a sessões comuns do agente.
- Deploy deve passar pelo CI/CD autorizado, com canary e rollback.

## 8. Dados e privacidade

- Minimize dados enviados ao modelo.
- Mascare PII e secrets antes de prompts, traces e logs.
- Não persista histórico quando a política exigir privacidade elevada.
- Defina retenção, residência, criptografia e descarte.
- Teste vazamento cross-tenant e recuperação indevida no RAG.

## 9. Observabilidade

Registre de forma redigida:

- request/correlation ID;
- usuário, papel e tenant;
- modelo e versão de prompt/policy;
- fontes recuperadas;
- tools solicitadas, autorizadas e executadas;
- argumentos normalizados e hash;
- aprovações;
- resultado e side effect confirmado;
- custo, latência, bloqueios e alertas.

Mantenha kill switch para tools mutáveis, MCPs e credenciais.

## 10. Evals e red team

Execute em todo PR relevante:

- alucinação e citações falsas;
- prompt injection direta e indireta;
- secret/PII exfiltration;
- path traversal e command injection;
- tool result spoofing;
- cross-tenant;
- bypass de aprovação;
- ações em lote;
- supply-chain e dependency confusion;
- falsas alegações de testes, build ou deploy.

Falhe o pipeline para vazamento de segredo, acesso cross-tenant, tool call não autorizada, bypass de aprovação ou regressão crítica de factualidade.

## 11. Rollout

1. modo somente leitura;
2. shadow mode sem side effect;
3. grupo interno pequeno;
4. ações reversíveis com aprovação;
5. canary por percentual;
6. expansão somente após métricas e incident review.

Defina rollback testado e critérios automáticos de interrupção.

## Resultado esperado

A segurança não depende de o agente “se comportar”. Mesmo diante de alucinação ou prompt injection, a identidade não possui privilégio, o arquivo sensível não pode ser lido, a rede não alcança o destino, o comando é bloqueado e a ação externa exige autorização verificável.
