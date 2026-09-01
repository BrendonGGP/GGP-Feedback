# Supabase e banco de dados

O ambiente de dados previsto para o projeto fica no Supabase, na regiÃ£o de SÃ£o Paulo. O projeto Supabase e as credenciais permanecem fora deste repositÃ³rio.

## Credencial local

Crie ou atualize o arquivo local `.env` somente na sua mÃ¡quina, sem versionÃ¡-lo, com a variÃ¡vel `DATABASE_URL` apontando para a conexÃ£o de banco indicada pelo painel do Supabase para migrations. NÃ£o envie essa URL, senhas ou chaves do Supabase pelo Git, PR, chat ou logs.

## Validar antes de aplicar

No PowerShell, dentro do projeto e com `DATABASE_URL` carregada apenas na sua sessÃ£o local:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:migrate:status
```

## Aplicar migrations

Depois de revisar o SQL versionado e aprovar a mudanÃ§a, execute:

```powershell
npm.cmd run prisma:migrate:deploy
```

Esse comando altera o banco configurado em `DATABASE_URL`; ele nunca deve ser executado contra produÃ§Ã£o sem aprovaÃ§Ã£o, backup e plano de rollback.
