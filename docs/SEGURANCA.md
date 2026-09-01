# Segurança e modelo de ameaças

## Ativos

- dados cadastrais de colaboradores;
- conteúdo de feedback;
- credenciais e sessões;
- hierarquia e papéis;
- trilha de auditoria;
- código, migrations e pipeline.

## Fronteiras de confiança

- navegador para aplicação;
- aplicação para autenticação;
- aplicação para PostgreSQL;
- importação para banco;
- GitHub Actions para ambientes;
- administrador para funções privilegiadas.

## Ameaças e controles mínimos

| Ameaça | Impacto | Controle preventivo |
|---|---|---|
| Acesso a colaborador fora da equipe | Vazamento de PII e feedback | autorização por registro no servidor e RLS |
| Manipulação de ID na URL | Acesso indevido | identidade derivada da sessão e consulta fail-closed |
| SQL injection | Leitura ou alteração indevida | Prisma, parâmetros e validação Zod |
| Roubo de senha | Comprometimento de conta | Argon2id, política de senha, bloqueio e futura MFA |
| Roubo de sessão | Sequestro de conta | cookie seguro, token aleatório armazenado por hash, expiração e revogação |
| CSV injection | Execução ao abrir exportação | neutralização de células iniciadas por `=`, `+`, `-` ou `@` |
| Vazamento em logs | Persistência de PII | redaction e proibição de texto de feedback, token e senha |
| Importação incorreta | Hierarquia ou acesso incorreto | dry-run, transação, limites, idempotência e rollback |
| Dependência comprometida | Execução de código malicioso | versões fixadas, lockfile, SCA, SBOM e revisão de scripts |
| Alteração indevida em produção | Indisponibilidade ou perda | pipeline protegido, aprovação, backup e rollback testado |

## Requisitos de autenticação

- sem cadastro público;
- identificador de login único e case-insensitive;
- senha armazenada somente por hash Argon2id;
- senha temporária exige troca no primeiro acesso;
- limitação de tentativas e bloqueio temporário;
- resposta de login não revela se a conta existe;
- sessões revogáveis e expiração por inatividade;
- operações administrativas exigem revalidação de autorização.

## Auditoria

Registrar: ator técnico, ação, tipo e ID da entidade, horário, request ID e resultado. Não registrar senha, token, texto do feedback, planilha bruta ou campos pessoais que não sejam necessários.

## Hardening recomendado

Para dados pessoais, o alvo é combinar níveis 2 e 3 do baseline local: controles corporativos, autorização por registro e pipeline protegido. Produção só será considerada pronta depois de testes de isolamento, backup, restauração, resposta a incidentes e revisão de privacidade.

## Riscos residuais atuais

- provedor, região e contratos ainda não foram aprovados;
- SSO/MFA ainda não foram definidos;
- dependências ainda não foram instaladas ou auditadas;
- políticas RLS e migrations SQL ainda não existem;
- retenção e descarte de feedbacks precisam de decisão do responsável pelo negócio.
