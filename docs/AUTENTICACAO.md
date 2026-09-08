# Autenticação e sessões

## Método de entrada

O MVP usa o provider `Credentials` do Auth.js para um nome de usuário e uma senha
provisionada. O nome de usuário segue o formato `nome.sobrenome`, é exclusivo e
não contém e-mail. Não há cadastro público. A conta
precisa estar `ACTIVE`, possuir papel válido e não estar bloqueada.

O segredo nunca é armazenado em texto puro. A senha é verificada com Argon2id;
tentativas inválidas incrementam o contador da conta e o quinto erro consecutivo
aplica bloqueio temporário de 15 minutos.

## Sessão

O Auth.js usa um cookie JWT criptografado com `AUTH_SECRET`. Cada login também
cria uma linha em `user_sessions`; somente o hash SHA-256 de um nonce aleatório
é persistido. O servidor valida existência, expiração, revogação, conta ativa,
versão da sessão e papéis em cada leitura.

## Troca de senha

Não existe recuperação pública de senha ou envio por e-mail. O Administrador do
Sistema é responsável por provisionar uma nova senha temporária para uma conta.
No primeiro acesso após esse provisionamento, a conta é direcionada à tela de
troca obrigatória. A nova senha precisa ter 9–128 caracteres, conter ao menos um
número e um caractere especial, não reutilizar a senha temporária e, após a
alteração, revogar as sessões anteriores.

## Configuração local

Defina `AUTH_SECRET` somente no `.env` local ou no gerenciador de segredos do
ambiente. Nunca envie o valor ao GitHub, PR, chat ou logs.

## Limites atuais

- A proteção de rotas de negócio deve ser adicionada junto com cada rota.
- RLS de negócio permanece fail-closed até a identidade da sessão ser propagada
  ao PostgreSQL por uma conexão de runtime de menor privilégio.
