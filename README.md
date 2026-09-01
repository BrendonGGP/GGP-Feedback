# GGP-Feedback

Plataforma interna para gestão de ciclos e feedbacks dos colaboradores do grupo GGP.

## Estado atual

O repositório contém a fundação Next.js, o esquema Prisma e a migration inicial do banco. A aplicação ainda não possui autenticação, dados reais ou conexão configurada com o Supabase; ambientes externos e deploy permanecem pendentes.

## Escopo do MVP

- autenticação por identificador interno ou e-mail corporativo;
- perfis de administrador, gestor e colaborador;
- acesso do gestor somente aos liderados diretos;
- cadastro de empresas, áreas, pessoas e hierarquia;
- criação e execução de ciclos de feedback;
- autoavaliação configurável por ciclo;
- exportação CSV autorizada;
- trilha de auditoria sem conteúdo sensível desnecessário.

PDI e geração de PDF ficam fora do MVP e serão tratados na fase 2.

## Documentação

- [Especificação do MVP](docs/ESPECIFICACAO_MVP.md)
- [Arquitetura](docs/ARQUITETURA.md)
- [Modelo de dados](docs/MODELO_DADOS.md)
- [Segurança e ameaças](docs/SEGURANCA.md)
- [Dados e privacidade](docs/DADOS_E_PRIVACIDADE.md)
- [Supabase e migrations](docs/SUPABASE.md)

## Stack aprovada

- Next.js e TypeScript;
- Tailwind CSS e shadcn/ui;
- PostgreSQL gerenciado;
- Prisma ORM e migrations versionadas;
- Auth.js com provisionamento administrativo;
- Zod, Vitest e Playwright;
- GitHub Actions;
- hospedagem proposta em Vercel e Supabase, condicionada à aprovação corporativa de região, privacidade e contratação.

## Segurança

Não coloque credenciais ou dados reais de colaboradores no repositório. Arquivos `.env`, chaves, credenciais e as fontes cadastrais locais estão bloqueados pelas políticas locais. Instalação de dependências, rede, banco remoto, Git remoto e deploy exigem aprovação específica.

## Fluxo de contribuição

Envie mudanças para uma branch diferente de `main`. Cada push executa as validações automáticas, mas não cria pull requests. Antes de criar um PR, revise o resumo das alterações, os arquivos modificados e os resultados das validações. O merge na `main` é sempre uma aprovação humana. O deploy contínuo permanece fora do escopo desta fase.

## Desenvolvimento local

Pré-requisitos: Node.js 20.9 ou superior e npm.

```powershell
npm.cmd ci --ignore-scripts --audit=false --fund=false
npm.cmd run dev
```

A aplicação fica disponível em `http://localhost:3000`. Antes de enviar uma mudança, execute:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```
