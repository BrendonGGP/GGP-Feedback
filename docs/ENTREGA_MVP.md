# Runbook de entrega do MVP

## Escopo entregue

O MVP cobre autenticação por identificador/e-mail, perfis segregados, estrutura
organizacional, ciclos e formulários, criação de feedback, rascunho, envio,
autoavaliação, consulta, exportação autorizada e análises agregadas.

O Administrador do Sistema administra contas e papéis sem acesso ao conteúdo
funcional. RH possui o escopo funcional completo; Gestor acessa apenas o próprio
escopo; Colaborador acessa os próprios registros autorizados.

PDI, PDF, calendário funcional, notificações externas e CD permanecem fora desta
entrega.

## Pré-requisitos

- Node.js 20.9 ou superior;
- npm e Python 3.14;
- acesso ao Supabase de desenvolvimento ou a um banco separado de homologação;
- arquivo `.env` criado localmente, sem versionamento, com as variáveis descritas
  em `docs/SUPABASE.md` e `docs/AUTENTICACAO.md`;
- dependências instaladas com `npm.cmd ci --ignore-scripts --audit=false --fund=false`.

## Validação local

Execute na raiz do projeto:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run validate:database
npm.cmd run validate:hardening
```

Para executar a aplicação localmente:

```powershell
npm.cmd run dev
```

Acesse `http://localhost:3000`. Use somente contas e dados sintéticos durante a
validação local.

## Checklist funcional

- [ ] Login com identificador e e-mail corporativo;
- [ ] troca obrigatória de senha no primeiro acesso;
- [ ] Administrador altera a senha temporária de outra conta;
- [ ] Administrador não acessa Feedback, PDI ou análises funcionais;
- [ ] RH cria ciclo, associa formulário e abre/encerra o ciclo;
- [ ] Gestor cria rascunho, envia feedback e consulta apenas seu escopo;
- [ ] Colaborador responde autoavaliação somente quando habilitada;
- [ ] feedback enviado permanece imutável para o usuário comum;
- [ ] exportação CSV disponível somente ao RH;
- [ ] análises exibem médias sem respostas textuais;
- [ ] tentativas inválidas de acesso retornam mensagem genérica;
- [ ] layout e navegação por teclado funcionam em desktop e mobile.

## Banco e dados

A migration de desenvolvimento já foi aplicada ao Supabase. Não execute uma
aplicação de migration em outro ambiente sem revisar o SQL, confirmar o alvo,
obter aprovação e definir backup e rollback.

O seed sintético é idempotente e deve ser usado somente no desenvolvimento:

```powershell
npm.cmd run prisma:seed:dev
npm.cmd run prisma:seed:dev -- -- --apply
npm.cmd run prisma:seed:dev -- -- --verify
```

As credenciais geradas pelo seed ficam apenas no arquivo local ignorado em
`dados-privados/`. Nunca as copie para PR, chat, logs ou documentação.

## CI e aprovação

Todo push e pull request para `main` executa o workflow `AI security baseline`,
que roda lint, typecheck, testes, build, auditoria de dependências, validações
Prisma e os validadores de guardrails. O merge na `main` é sempre manual.

O fluxo de entrega de cada alteração é:

1. branch dedicada;
2. commit pequeno e revisado;
3. PR com resumo, validações, riscos e pendências;
4. checks verdes;
5. aprovação humana e merge.

## Pendências antes de produção

- configurar `AUTH_SECRET` e demais segredos no gerenciador do ambiente;
- trocar o runtime administrativo pela identidade de menor privilégio e integrar
  todos os serviços ao contexto transacional das policies RLS;
- homologar backup, restauração, retenção e descarte de dados;
- concluir revisão corporativa de privacidade e do Supabase;
- definir SSO/MFA, domínio final e responsáveis por incidentes;
- escolher hospedagem e criar o CD somente após aprovação específica.

Sem essas aprovações, este repositório deve ser tratado como MVP validado em
desenvolvimento, não como autorização para operar em produção.
