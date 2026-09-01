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
- **Identidade:** Auth.js com contas provisionadas; sessões revogáveis persistidas por hash.
- **Dados:** PostgreSQL e Prisma; toda alteração estrutural será uma migration versionada no Git.
- **Testes:** Vitest para domínio e integração; Playwright para fluxos críticos.
- **CI:** lint, type check, testes, build, validação de migrations, secret scan e análise de dependências.

## Autorização

As consultas recebem a identidade da sessão no servidor e aplicam uma das condições:

- `ADMIN`: escopo organizacional completo autorizado;
- `MANAGER`: lista e cria feedback para `pessoa.manager_id = pessoa_do_usuario`, mas lê feedback submetido somente quando também é o avaliador registrado;
- `EMPLOYEE`: `pessoa.id = pessoa_do_usuario`.

Rotas de leitura, escrita e exportação usam a mesma camada de autorização. Identificadores fornecidos pelo navegador nunca substituem a identidade autenticada.

## Ambientes

- desenvolvimento local com dados sintéticos;
- homologação com banco separado e dados minimizados;
- produção isolada e acessível somente por pipeline autorizado.

Nenhuma migration de desenvolvimento será executada automaticamente em produção. Deploy e migration produtiva exigirão aprovação e rollback testado.

## Decisões pendentes

- região aprovada para aplicação e banco;
- política corporativa de retenção dos feedbacks;
- responsável formal por segurança, incidentes e administração;
- exigência futura de SSO/MFA;
- processo de entrega da credencial inicial e recuperação de acesso;
- domínio final e remetente de e-mail, caso notificações sejam incluídas.
