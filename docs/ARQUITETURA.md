# Arquitetura proposta

## Visão geral

```text
Navegador
   -> Next.js
      -> autenticação e sessão
      -> autorização por registro
      -> serviços de domínio
      -> Prisma
         -> PostgreSQL
```

O frontend e as rotas de servidor ficam no mesmo projeto Next.js. O navegador nunca acessa o banco diretamente e nunca decide a autorização final.

## Componentes

- **Interface:** Next.js, React, TypeScript, Tailwind CSS e componentes locais baseados em shadcn/ui.
- **Servidor:** rotas e ações do Next.js com validação Zod.
- **Identidade:** Auth.js com provider de credenciais e contas provisionadas;
  o cookie JWT é vinculado a uma sessão persistida por hash, permitindo
  revogação individual e global.
- **Dados:** PostgreSQL e Prisma; toda alteração estrutural será uma migration versionada no Git.
- **Testes:** Vitest para domínio e integração; Playwright para fluxos críticos.
- **CI:** lint, type check, testes, build, validação de migrations, secret scan e análise de dependências.

## Autorização

As consultas recebem a identidade da sessão no servidor e aplicam as regras
detalhadas em `docs/AUTORIZACAO.md`:

- `SYSTEM_ADMIN`: administra o sistema sem acessar conteúdo de feedback ou PDI;
- `HR_ADMIN`: escopo funcional completo nas empresas autorizadas;
- `MANAGER`: lista liderados diretos, mas lê feedback submetido somente quando
  também é o avaliador registrado;
- `EMPLOYEE`: acessa apenas os próprios registros autorizados.

Rotas de leitura, escrita e exportação usam a mesma camada de autorização. Identificadores fornecidos pelo navegador nunca substituem a identidade autenticada.

## Ambientes

- desenvolvimento local com dados sintéticos;
- homologação com banco separado e dados minimizados;
- produção isolada e acessível somente por pipeline autorizado.

Nenhuma migration de desenvolvimento será executada automaticamente em produção. Deploy e migration produtiva exigirão aprovação e rollback testado.

## Decisões pendentes

- aprovação corporativa formal do Supabase na região de São Paulo;
- política corporativa de retenção dos feedbacks;
- responsável formal por segurança, incidentes e administração;
- exigência futura de SSO/MFA;
- processo de entrega da credencial inicial e recuperação de acesso;
- domínio final e remetente de e-mail, caso notificações sejam incluídas.
