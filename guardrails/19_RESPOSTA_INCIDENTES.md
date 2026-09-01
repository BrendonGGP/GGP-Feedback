# Runbook de resposta a incidentes de IA e Codex

## Gatilhos

- secret ou PII apareceu em resposta/log;
- acesso ou tentativa cross-tenant;
- tool call não autorizada;
- aprovação falsificada ou reutilizada;
- comando fora da policy;
- MCP/skill mudou identidade, descrição ou conjunto de tools;
- alucinação causou decisão ou comunicação material;
- custo, volume ou latência anormal;
- produção ou infraestrutura foi alterada inesperadamente.

## 1. Conter

- acione kill switch das tools mutáveis;
- desabilite MCP/skill suspeito;
- revogue tokens e sessões afetadas;
- bloqueie usuário, tenant, destino ou versão quando necessário;
- suspenda rollout e restaure configuração conhecida;
- preserve evidências sem copiar secrets para canais inseguros.

## 2. Preservar evidência

Registre:

- correlation/request ID;
- horário e timezone;
- identidade, papel, tenant e ambiente;
- versão do modelo, prompt, `AGENTS.md`, config, requirements, rules e policy;
- input redigido;
- fontes e resultados recuperados;
- tool calls, argumentos normalizados, approvals e respostas;
- diff, commit, artefato e hashes;
- logs de autenticação, rede, gateway e serviço alvo.

## 3. Classificar

- severidade S1 a S4;
- confidencialidade, integridade, disponibilidade, privacidade e impacto regulatório;
- tenants e registros afetados;
- ação concluída, tentada ou apenas proposta;
- reversibilidade;
- necessidade de jurídico, DPO, segurança, fornecedor ou comunicação externa.

## 4. Erradicar

- remova conteúdo envenenado do RAG;
- corrija autorização no backend;
- reduza scopes e permissões;
- atualize rules/requirements;
- revoque e rotacione secrets;
- fixe ou remova dependência/MCP/skill;
- adicione validação de schema, destino, path ou argumentos;
- crie teste de regressão reproduzível.

## 5. Recuperar

- restaure dados ou configuração;
- execute validação independente;
- reative primeiro somente leitura;
- use canary e monitore indicadores;
- confirme que credenciais antigas foram invalidadas;
- documente risco residual e aprovação para retorno.

## 6. Pós-incidente

- linha do tempo factual;
- causa raiz técnica e organizacional;
- controles que falharam ou faltaram;
- por que detecção não ocorreu antes;
- ações com proprietário e prazo;
- atualização de threat model, evals e runbooks;
- decisão sobre notificação conforme obrigação aplicável.

Não use “o modelo errou” como causa raiz final. Identifique por que a arquitetura permitiu que a saída do modelo alcançasse um ativo ou efeito sem contenção suficiente.
