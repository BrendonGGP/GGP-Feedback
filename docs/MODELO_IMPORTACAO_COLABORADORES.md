# Modelo de importacao de colaboradores

O arquivo `MODELO_IMPORTACAO_COLABORADORES.csv` e um modelo vazio, codificado em
UTF-8 e compativel com Excel. Preencha uma linha por pessoa. Nao altere os nomes
dos cabecalhos, pois eles serao usados pelo importador.

## Campos

| Campo | Obrigatorio | Como preencher |
|---|---:|---|
| `person_key` | Sim | Identificador unico, estavel e compativel com nome de usuario. Ele sera usado como login; nao use o nome como chave. |
| `full_name` | Sim | Nome completo, sem abreviacoes ambiguas. |
| `corporate_email` | Nao | E-mail corporativo valido para contato e referencia. Ele nao e usado para autenticacao. |
| `job_title` | Sim | Cargo atual da pessoa. |
| `employment_regime` | Sim | Regime de contratacao, por exemplo `CLT` ou `PJ`. |
| `company_name` | Sim | Nome exato da empresa a qual a pessoa pertence. |
| `department_name` | Sim | Nome exato do departamento/area dentro da empresa. |
| `manager_person_key` | Nao | `person_key` do gestor direto. Deixe vazio somente para a raiz da estrutura, como o CEO. |

## Regras que serao validadas

- `person_key` nao pode se repetir.
- O `person_key` sera normalizado para minusculas e usado como nome de usuario. Deve ter de 3 a 64 caracteres, usando letras minusculas, numeros e separadores `.`, `_` ou `-`.
- E-mails nao podem se repetir, mesmo com diferencas de maiusculas/minusculas.
- Uma pessoa nao pode ser sua propria gestora.
- O gestor informado precisa existir na propria carga e estar ativo.
- O vinculo de gestor sera resolvido por `person_key`, nunca por nome.
- Empresas e departamentos serao normalizados antes da gravacao.
- Uma pessoa pode ser liderada e tambem possuir liderados.
- Toda pessoa deve possuir um `person_key` valido; o e-mail corporativo continua opcional.
- A carga sera executada primeiro em modo de simulacao (`dry-run`).

## Perfis de acesso

O perfil de acesso nao deve ser colocado nesta planilha. Pessoas e contas sao
entidades separadas no sistema. Depois da importacao da estrutura, o
Administrador do Sistema devera provisionar as contas e atribuir os perfis
`RH`, `GESTOR` ou `COLABORADOR` conforme a aprovacao do responsavel.

## Como usar com seguranca

1. Faca uma copia deste arquivo e preencha somente essa copia.
2. Salve a copia em `dados-privados/`, fora do GitHub.
3. Nao envie o arquivo preenchido por chat, PR, e-mail ou ferramenta externa.
4. Execute o `dry-run` e revise apenas as contagens e os tipos de erro.
5. So depois autorize a aplicacao transacional no Supabase definido para a carga.

O `person_key` normalizado sera gravado como nome de usuario na conta de acesso
(`AccessAccount.loginIdentifier`), enquanto o e-mail permanecera apenas no cadastro
funcional da pessoa. O perfil de acesso continua sendo provisionado separadamente pelo
Administrador do Sistema.

Se a copia ainda possuir uma coluna `username` de um modelo anterior, ela sera aceita
por compatibilidade, mas seus valores serao ignorados.

O arquivo original da planilha de cadastro deve permanecer preservado e nao
sera alterado pelo importador.
