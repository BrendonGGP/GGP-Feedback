# Autenticação e sessões

## Método de entrada

O MVP usa o provider `Credentials` do Auth.js para o identificador interno ou
e-mail corporativo e uma senha provisionada. Não há cadastro público. A conta
precisa estar `ACTIVE`, possuir pelo menos um papel válido e não estar bloqueada.
Respostas de credenciais inválidas retornam o mesmo resultado genérico,
independentemente de a conta existir.

O segredo nunca é armazenado em texto puro. A senha é verificada com Argon2id;
tentativas inválidas incrementam o contador da conta e o quinto erro consecutivo
aplica bloqueio temporário de 15 minutos.

## Sessão

O Auth.js usa um cookie JWT criptografado com `AUTH_SECRET`. Cada login também
cria uma linha em `user_sessions`; somente o hash SHA-256 de um nonce aleatório
é persistido, enquanto o nonce permanece apenas dentro do cookie criptografado.
Em cada leitura da sessão, o servidor confirma:

- existência, expiração e revogação da sessão persistida;
- correspondência em tempo constante entre o nonce do cookie e o hash persistido;
- conta ativa e versão de sessão vigente;
- papéis válidos e compatíveis com a segregação de `SYSTEM_ADMIN`.

O logout revoga a sessão persistida. A revogação de todas as sessões incrementa
`session_version` e invalida cookies existentes. Rotas de negócio devem chamar
`getAuthenticatedActor` ou `requireAuthenticatedActor` próximo à consulta de
dados, em vez de confiar no conteúdo do cookie.

## Configuração local

Defina `AUTH_SECRET` somente no `.env` local ou no gerenciador de segredos do
ambiente. Gere um valor aleatório forte com o comando oficial `npx auth secret`
ou equivalente seguro. Nunca envie o valor ao GitHub, PR, chat ou logs.

O CI usa apenas um segredo efêmero de teste quando precisar executar código que
inicializa o Auth.js; ele não concede acesso a nenhum ambiente externo.

## Limites atuais

- A página de login está implementada; usuários com sessão válida são enviados
  diretamente à área inicial correspondente ao seu papel.
- As áreas internas ainda são páginas provisórias protegidas. O conteúdo e o
  visual definitivo dependem dos prints de referência e da implementação de
  cada módulo.
- Contas com `must_change_password` permanecem bloqueadas de forma fail-closed.
  A troca obrigatória de senha será implementada antes do provisionamento de
  usuários; até lá, somente contas com senha definitiva podem iniciar sessão.
- A proteção de rotas de negócio deve ser adicionada junto com cada rota; a
  existência do handler `/api/auth` não autoriza nenhuma consulta por si só.
- RLS de negócio permanece fail-closed até a identidade da sessão ser propagada
  ao PostgreSQL por uma conexão de runtime de menor privilégio.
