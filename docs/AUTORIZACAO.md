# Perfis e limites de autorização

Os perfis de acesso são independentes do cargo cadastrado na planilha. A
hierarquia de pessoas determina a equipe do gestor; o papel determina quais
operações podem ser solicitadas. Toda decisão final ocorre no servidor e, após
a integração da identidade, também será reforçada por RLS no PostgreSQL.

## Perfis aprovados

| Papel técnico | Nome exibido | Limite principal |
|---|---|---|
| `SYSTEM_ADMIN` | Administrador do Sistema | Administra configuração técnica, contas e papéis, sem ler conteúdo de feedback ou PDI |
| `HR_ADMIN` | RH | Administra o domínio funcional e consulta todas as empresas autorizadas |
| `MANAGER` | Gestor | Consulta a própria equipe e os feedbacks dos quais é o avaliador registrado |
| `EMPLOYEE` | Colaborador | Consulta somente os próprios feedbacks e, futuramente, o próprio PDI |

## Entrada no portal

Depois da autenticação, o servidor escolhe a área inicial com precedência
explícita e nunca aceita um destino definido pelo navegador:

| Papel | Área inicial |
|---|---|
| `SYSTEM_ADMIN` | `/portal/administracao` |
| `HR_ADMIN` | `/portal/rh` |
| `MANAGER` | `/portal/equipe` |
| `EMPLOYEE` | `/portal/meus-feedbacks` |

Quando papéis funcionais são acumulados, a precedência é RH, Gestor e
Colaborador. Cada área continua verificando o papel necessário no servidor;
ausência, papel desconhecido ou combinação inválida redireciona de forma
fail-closed, sem renderizar conteúdo protegido.

`SYSTEM_ADMIN` é exclusivo e não pode ser combinado com um papel funcional na
mesma conta. Caso uma pessoa precise exercer as duas responsabilidades, devem
ser usadas identidades separadas. Isso evita que uma permissão técnica conceda
acesso indireto a conteúdo confidencial. A regra é validada pela biblioteca de
autorização e por uma trava transacional nas atribuições de papéis do banco.

Uma pessoa pode acumular os papéis funcionais `MANAGER` e `EMPLOYEE`, pois um
gestor também pode receber feedback do próprio gestor.

## Regras de conteúdo

- RH acessa o conteúdo funcional no escopo de todas as empresas autorizadas.
- Gestor enxerga os liderados diretos atuais e lê apenas feedbacks em que consta
  como avaliador; uma troca de gestor não transfere feedbacks históricos.
- Colaborador lê apenas feedbacks em que consta como pessoa avaliada.
- Administrador do Sistema não lê feedbacks nem PDI, mesmo em uma atribuição de
  papéis inválida ou ambígua.
- Ausência, ambiguidade ou combinação inválida de papéis resulta em bloqueio.

PDI permanece fora do MVP. A regra documentada e testada neste momento serve
como limite obrigatório para sua implementação futura.

## Aplicação em camadas

1. A biblioteca de autorização valida papel, pessoa, vínculo e autoria no
   servidor.
2. Rotas, ações e exportações devem reutilizar a mesma política, sem confiar em
   identificadores enviados pelo navegador.
3. RLS permanece sem políticas permissivas até que a sessão autenticada seja
   propagada ao banco por uma identidade de runtime de menor privilégio.
4. Testes de isolamento devem cobrir acesso cruzado entre pessoas, equipes e
   empresas antes de qualquer ambiente produtivo.
