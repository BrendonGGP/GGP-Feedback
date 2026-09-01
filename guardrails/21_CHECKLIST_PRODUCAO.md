# Checklist de produção para Codex e aplicações com IA

## Agente e configuração

- [ ] `AGENTS.md` revisado e específico do repositório.
- [ ] `.codex/config.toml` validado na versão implantada do Codex.
- [ ] `requirements.toml` distribuído por configuração gerenciada.
- [ ] Permission profiles testados; full access indisponível.
- [ ] `.codex/rules/*.rules` testadas com `codex execpolicy check`.
- [ ] Rede, web search, apps, browser, computer use e MCPs controlados separadamente.
- [ ] Histórico e analytics alinhados à política de privacidade.

## Identidade, dados e autorização

- [ ] SSO/MFA e identidade de serviço separada.
- [ ] Tenant e autorização por registro validados no backend.
- [ ] Secrets fora de prompts/configs e armazenados em vault/keyring.
- [ ] PII mascarada em traces e logs.
- [ ] Retenção e descarte definidos.
- [ ] Teste cross-tenant aprovado.

## Tools, MCPs e skills

- [ ] Default deny.
- [ ] Schema estrito de entrada e saída.
- [ ] Aprovação vinculada ao hash exato dos argumentos.
- [ ] Idempotência e replay protection.
- [ ] MCPs em allowlist por identidade.
- [ ] Versões/commits/digests fixados.
- [ ] SBOM, licença, secret scan e vulnerability scan aprovados.
- [ ] Sandbox sem root, sem Docker socket, filesystem mínimo e rede deny.
- [ ] Drift de tools e descrições monitorado.

## Factualidade e RAG

- [ ] Fontes autorizadas e vigentes.
- [ ] ACL/tenant aplicada antes da recuperação.
- [ ] Citações verificadas.
- [ ] Claims sem suporte removidas.
- [ ] Conflitos de versões detectados.
- [ ] Prompt injection indireta testada.
- [ ] Critério de abstinência calibrado.

## Engenharia e supply chain

- [ ] Branch protection e revisão obrigatória.
- [ ] Lockfiles e versões fixadas.
- [ ] SAST, SCA, secret scan, IaC e container scan no CI.
- [ ] SBOM gerada para release.
- [ ] Testes unitários, integração e regressão executados.
- [ ] Dependências e scripts de instalação revisados.

## Operação

- [ ] Limites de chamadas, custo, volume e timeout.
- [ ] Circuit breaker e kill switch testados.
- [ ] Alertas para injection, PII, secret, cross-tenant, drift e tool anomalies.
- [ ] Rollout em shadow/canary.
- [ ] Rollback testado.
- [ ] Runbook e contatos de incidente atualizados.
