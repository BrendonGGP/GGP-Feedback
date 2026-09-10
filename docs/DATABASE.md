# PostgreSQL e banco de dados

O desenvolvimento do projeto usa PostgreSQL local, administrado pelo DBeaver.
Projeto, URLs, credenciais e dados reais permanecem fora do repositório.

## Conexões locais

O Prisma usa duas conexões com responsabilidades diferentes:

- `DATABASE_URL`: conexão usada pelo runtime;
- `DIRECT_URL`: conexão direta usada pelo Prisma Migrate;
- `ADMIN_DATABASE_URL`: conexão administrativa usada pela autenticação, sessões,
  troca de senha e administração técnica.

O ambiente local também define `LOCAL_DATABASE_URL` com `schema=ggp`; em
desenvolvimento, a aplicação usa essa URL para garantir que o runtime aponte
para o banco local. O `schema.prisma` referencia somente os nomes das variáveis.
Crie o `.env` manualmente, sem versioná-lo:

```env
DATABASE_URL="postgresql://postgres:<senha>@127.0.0.1:5432/ggp_feedback_local?schema=ggp"
DIRECT_URL="postgresql://postgres:<senha>@127.0.0.1:5432/ggp_feedback_local?schema=ggp"
ADMIN_DATABASE_URL="postgresql://<usuario-admin>:<senha>@127.0.0.1:5432/ggp_feedback_local?schema=ggp"
```

No ambiente local atual, `ADMIN_DATABASE_URL` pode ficar ausente: o código usa
`DIRECT_URL` apenas como fallback compatível. Antes da produção, configure uma
URL administrativa explícita, com um usuário separado e privilégios mínimos.
Não envie URLs, senhas ou chaves pelo Git, PR, chat ou logs.
Se existir uma URL de um provedor anterior no `.env`, substitua-a pelas
conexões locais antes de executar comandos Prisma; não deixe um fallback remoto.

## Validar antes de aplicar

Com as variáveis configuradas localmente:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:migrate:status
```

`prisma:migrate:status` consulta o banco, mas não aplica migrations.

## Aplicar migrations

Somente após revisar o SQL, confirmar o banco local e obter aprovação explícita:

```powershell
npm.cmd run prisma:migrate:deploy
```

Esse comando altera o banco apontado por `DIRECT_URL`. Banco com dados exige
backup, janela de mudança e rollback testado.

## Contas sintéticas de desenvolvimento

O conjunto sintético pode ser provisionado no banco local com o seed idempotente:

```powershell
npm.cmd run prisma:seed:dev
npm.cmd run prisma:seed:dev -- -- --apply
npm.cmd run prisma:seed:dev -- -- --verify
```

O primeiro comando é apenas um dry-run. O segundo cria ou atualiza somente a
empresa, departamentos, pessoas, contas e papéis sintéticos definidos em
`scripts/seed/seed-dev-accounts.mjs`. O terceiro faz uma conferência somente leitura.

As senhas temporárias são geradas localmente e gravadas apenas em
`dados-privados/contas-sinteticas-dev.txt`, que é ignorado pelo Git. Nunca copie
esse arquivo para o repositório, PR, chat ou logs.

## Fronteira de runtime e RLS

A migration `20260908170000_add_runtime_rls_context` cria a role `ggp_runtime`
com `NOLOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOINHERIT` e
`NOBYPASSRLS`. Ela recebe somente os privilégios das tabelas funcionais e
nenhum privilégio de autenticação, sessões ou administração técnica.

Como a estrutura local foi inicializada no schema `ggp`, a migration
`20260909120000_align_local_ggp_rls` instala nesse schema as policies equivalentes
sem alterar os dados. A role de runtime foi validada com contexto transacional
para RH, gestor, colaborador e administrador do sistema.

As policies usam funções no schema `ggp`, alimentadas por configurações
transaction-local (`ggp.account_id`, `ggp.person_id` e `ggp.roles`). O helper
`withDatabaseActor` configura esses valores e entrega o cliente de transação;
enquanto o helper está ativo, o proxy de compatibilidade de `runtimePrisma`
encaminha chamadas legadas para essa transação. Fora desse escopo, chamadas do
cliente global não têm identidade RLS e não devem ser usadas nessa fronteira.

O cliente de runtime e o cliente administrativo agora são instâncias separadas.
Autenticação, sessões, troca de senha e administração técnica usam
`adminPrisma`; as rotinas funcionais usam `runtimePrisma`. No desenvolvimento o
fallback acima mantém o ambiente atual funcionando, mas não substitui a
provisão de credenciais distintas.

Os scripts de importação e seed também usam a URL administrativa, seguindo a
mesma precedência (`ADMIN_DATABASE_URL`, depois `DIRECT_URL`).

As operações funcionais já são executadas por `withDatabaseActor`, que mantém
as consultas na mesma transação em que os GUCs de identidade são definidos.
Antes de habilitar `ggp_runtime` em um ambiente implantado, ainda é obrigatório
configurar a credencial fora do Git e executar probes de isolamento com uma
conexão que não tenha `BYPASSRLS`.

Concessões de roles são metadados globais e não devem ser tratadas como parte de
uma transação de dados. Qualquer associação temporária criada para um probe deve
ser removida com autoridade de administração de roles antes de encerrar a
janela de validação.

## Histórico de migrations

Algumas migrations antigas mantêm nomes históricos relacionados ao provedor
anterior. Esses arquivos são imutáveis para preservar o histórico do Prisma e
não representam uma dependência ativa do projeto.
