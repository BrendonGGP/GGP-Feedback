# Estrutura do projeto

Este documento descreve onde cada tipo de código deve ficar. A organização
separa apresentação, regras de negócio, infraestrutura e operação sem alterar
as URLs públicas do portal.

## Visão da árvore

```text
.
├── src/
│   ├── app/                 # rotas, páginas e ações específicas da rota
│   ├── components/          # componentes visuais reutilizáveis
│   ├── lib/
│   │   ├── auth/            # identidade, sessão, credenciais e senhas
│   │   ├── authorization/   # papéis, políticas e decisões de acesso
│   │   ├── administration/  # casos de uso administrativos
│   │   ├── dashboard/       # consultas de visão geral
│   │   ├── feedback/        # casos de uso e validações de feedback
│   │   ├── hr/              # ciclos, organização e diretório de pessoas
│   │   ├── team/            # consultas da equipe do gestor
│   │   ├── infrastructure/ # integrações técnicas; hoje, PostgreSQL/Prisma
│   │   │   └── database/    # clientes, conexão e contexto RLS
│   │   └── shared/          # valores puros usados por mais de um domínio
│   └── types/               # extensões de tipos do framework
├── prisma/                  # schema e migrations versionadas
├── scripts/
│   ├── database/            # clientes e rotinas técnicas de banco
│   ├── import/              # importações administrativas
│   └── seed/                # carga de desenvolvimento/homologação
├── public/                  # arquivos estáticos sem lógica de negócio
├── ggp_guardrails/          # biblioteca local de validação e hardening
├── .github/                 # automações de CI
├── docs/                    # decisões, contratos e procedimentos
└── guardrails/              # pacote de referência, não runtime da aplicação
```

`dados-privados/` continua sendo uma área local ignorada pelo Git. Ela não faz
parte do artefato da aplicação e nunca deve ser importada por código de
produção.

## Regras de dependência

1. Arquivos em `src/app/` podem chamar componentes e casos de uso de `src/lib/`,
   mas não devem acessar Prisma diretamente.
2. `src/components/` recebe dados e callbacks; não consulta banco, sessão ou
   segredos.
3. Domínios em `src/lib/<dominio>/` concentram validação e regras funcionais.
   Eles podem usar contratos compartilhados e a infraestrutura por meio de
   seus adaptadores explícitos.
4. Apenas `src/lib/infrastructure/database/` cria ou configura clientes Prisma.
   Consultas funcionais usam o cliente runtime com `withDatabaseActor`; os
   fluxos técnicos usam o cliente administrativo.
5. `src/lib/auth/` e `src/lib/authorization/` são camadas de segurança. Uma
   página nunca deve duplicar uma decisão de papel ou confiar em um identificador
   enviado pelo navegador.
6. Testes unitários permanecem próximos do módulo testado. Testes de fluxo que
   precisarem de navegador ou banco real devem ser adicionados em `tests/`.
7. Scripts só podem ser executados pelos comandos documentados em
   `package.json`. Eles não devem ser importados pelo bundle do Next.js.

## Convenções para novas funcionalidades

- Crie a rota e seus arquivos visuais colocalizados em `src/app/` para preservar
  a convenção do App Router (`page.tsx`, `actions.ts`, `*.module.css`).
- Coloque lógica reutilizável fora da rota, no domínio correspondente em
  `src/lib/`.
- Para integração externa, crie um adaptador em `src/lib/infrastructure/` e um
  contrato pequeno no domínio consumidor.
- Nomeie funções por intenção (`createCycle`, `getFeedbackOverview`) e evite
  nomes genéricos como `utils.ts` ou `helpers.ts`.
- Atualize este mapa e `docs/ARQUITETURA.md` quando uma nova camada ou
  integração for introduzida.

## O que não foi movido

As rotas e os componentes específicos de cada tela continuam no local de
origem. Isso é intencional: o Next.js usa a árvore de `src/app/` como contrato
de roteamento, e a colocalização reduz imports frágeis. A reorganização foi
aplicada às fronteiras que não alteram URLs nem comportamento funcional.
