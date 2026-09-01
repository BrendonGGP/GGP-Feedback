# Contexto enxuto para desenvolvimento com IA

Este arquivo é o ponto de entrada técnico do projeto. Leia apenas as referências da tarefa atual; não carregue todo o diretório `guardrails/`.

## Estado e arquitetura

- Next.js e TypeScript concentram interface e servidor.
- Prisma descreve o domínio; PostgreSQL é fornecido pelo Supabase na região de São Paulo.
- A migration inicial está versionada, mas sua aplicação remota precisa ser confirmada separadamente.
- Autenticação, autorização, políticas RLS de negócio e telas do produto ainda serão implementadas.
- Antes de criar telas, solicite ao responsável os prints de referência visual.

## Mapa do código

| Caminho | Responsabilidade |
|---|---|
| `src/app/` | rotas, layout e estilos globais |
| `src/components/` | componentes visuais reutilizáveis |
| `src/lib/` | tipos e regras sem dependência da interface |
| `prisma/` | esquema e migrations imutáveis do banco |
| `ggp_guardrails/` | biblioteca de validação ativa do projeto |
| `.agents/skills/` | preflight, revisão segura e hardening sob demanda |
| `guardrails/` | pacote-base de referência e testes adversariais |
| `docs/` | decisões funcionais, arquitetura, segurança e operação |

## Leitura por tarefa

- Produto ou regra de negócio: `docs/ESPECIFICACAO_MVP.md` e o módulo afetado.
- Banco: `docs/MODELO_DADOS.md`, `docs/SUPABASE.md`, `prisma/schema.prisma` e a migration relevante.
- Interface: print fornecido pelo responsável, rota e componentes relacionados.
- Segurança: skill aplicável e `docs/SEGURANCA.md`; abra documentos extensos de `guardrails/` somente quando a checklist apontar necessidade.
- CI/CD: workflow afetado, `package.json` e validadores em `ggp_guardrails/`.

## Validação local

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run validate:database
npm.cmd run validate:hardening
```

Use uma `DATABASE_URL` sintética somente para validar ou gerar o Prisma sem conexão. Aplicar migration, usar rede, publicar branch ou criar PR exige aprovação explícita.

## Fluxo GitHub

Confirme no remoto se o PR anterior entrou na `main`, sincronize a branch base e trabalhe em uma branch nova. Ao publicar, o PR deve conter título, resumo, validações, riscos e pendências. O merge é sempre humano.
