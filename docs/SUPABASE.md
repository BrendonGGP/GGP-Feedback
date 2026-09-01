# Supabase e banco de dados

O PostgreSQL do projeto está no Supabase, na região de São Paulo. Projeto, URLs e credenciais permanecem fora do repositório.

## Conexões locais

O Prisma 6 utiliza duas conexões com responsabilidades diferentes:

- `DATABASE_URL`: transaction pooler na porta `6543`, reservado para o runtime serverless;
- `DIRECT_URL`: conexão direta ou session pooler na porta `5432`, usada por Prisma Migrate e comandos administrativos.

O `schema.prisma` referencia somente os nomes das variáveis. Crie o `.env` manualmente, sem versioná-lo:

```env
DATABASE_URL="postgresql://...:6543/postgres"
DIRECT_URL="postgresql://...:5432/postgres"
```

Use as strings fornecidas pelo painel em **Connect → ORM → Prisma** e substitua os marcadores de senha localmente. Não envie URLs, senhas ou chaves pelo Git, PR, chat ou logs.

As credenciais administrativas usadas nesta fase não devem ser reutilizadas pelo runtime implantado. Antes de conectar a aplicação, será definida uma identidade de menor privilégio coerente com autenticação e RLS.

## Validar antes de aplicar

Com as duas variáveis configuradas localmente:

```powershell
npm.cmd run prisma:validate
npm.cmd run prisma:migrate:status
```

`prisma:migrate:status` consulta o banco, mas não aplica migrations.

## Aplicar migrations

Somente após revisar o SQL, confirmar o ambiente e obter aprovação explícita:

```powershell
npm.cmd run prisma:migrate:deploy
```

Esse comando altera o banco apontado por `DIRECT_URL`. Banco com dados exige backup, janela de mudança e rollback testado.
