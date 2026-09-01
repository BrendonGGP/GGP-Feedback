# Especificação do MVP

## Objetivo

Disponibilizar uma aplicação web interna para registrar e consultar feedbacks por ciclo, respeitando a estrutura hierárquica do grupo GGP.

Data-alvo informada: 04/09/2026. A data é uma meta de planejamento e não constitui confirmação de deploy.

## Pessoas e estrutura

- A base validada possui 101 pessoas, incluindo gestores.
- `Colaboradores` é a visão cadastral geral.
- `Gestores` é a visão de gestão e relacionamento hierárquico.
- As duas visões representam o mesmo quadro e não devem ser somadas.
- Uma pessoa pode ser simultaneamente gestor e liderado.
- O CEO é a raiz e não possui gestor superior.
- Há um caso especial sem e-mail corporativo que deverá receber identificador de login interno exclusivo.

## Papéis

### Administrador

- administra empresas, áreas, pessoas, contas, ciclos e formulários;
- consulta todas as empresas;
- exporta CSV dentro do escopo autorizado;
- não obtém senha de usuários nem conteúdo por meio dos logs.

### Gestor

- consulta somente seus liderados diretos;
- cria e envia feedback somente para liderado direto no ciclo permitido;
- consulta o feedback que ele próprio produziu, sem herdar automaticamente o conteúdo produzido por um gestor anterior;
- também pode receber feedback do próprio gestor.

### Colaborador

- consulta somente seus próprios registros autorizados;
- responde autoavaliação apenas quando habilitada no ciclo.

## Regras obrigatórias

1. Toda autorização é validada no servidor; ocultar elementos na interface não é controle de acesso.
2. Ausência ou ambiguidade de identidade, papel, ciclo ou vínculo resulta em bloqueio.
3. O vínculo hierárquico usa identificadores internos, nunca comparação de nomes.
4. E-mail é um possível identificador de login, mas não é chave de relacionamento.
5. Contas são provisionadas por administrador; não há cadastro público no MVP.
6. Um feedback enviado torna-se imutável para o usuário comum; correções administrativas são auditadas.
7. Exportação CSV aplica as mesmas regras de autorização da consulta em tela.
8. PDI e PDF permanecem fora do MVP.
9. A troca de gestor não transfere automaticamente a autoria ou a leitura de feedbacks históricos; qualquer regra diferente exigirá decisão explícita do negócio.

## Critérios de aceite iniciais

- administrador acessa o conjunto autorizado completo;
- gestor não acessa pessoa que não seja seu liderado direto;
- colaborador não acessa feedback de outra pessoa;
- CEO funciona sem gestor superior;
- pessoa sem e-mail consegue autenticar por identificador interno;
- importação rejeita duplicidade de login e vínculo inválido;
- falhas de autorização retornam resposta genérica, sem confirmar a existência do registro;
- logs não armazenam texto de feedback, senha, token ou planilha bruta.

## Fora do escopo

- PDI;
- PDF;
- cadastro público;
- integração com folha de pagamento;
- avaliação automática por IA;
- aplicativo móvel nativo;
- comunicação externa automática.
