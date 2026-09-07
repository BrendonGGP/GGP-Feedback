# Modelo de dados

## Princípios

- Identidade funcional (`Person`) é separada da conta de acesso (`AccessAccount`).
- E-mail pode ser nulo e nunca é usado como chave de hierarquia.
- Empresa e área são entidades distintas; a unicidade da área é por empresa.
- O gestor atual é uma relação por ID e o histórico é preservado.
- Feedback mantém quem avaliou, quem recebeu e em qual ciclo.
- Registros sensíveis usam exclusão lógica ou status; exclusão física não faz parte do fluxo comum.

## Entidades centrais

```text
Company 1 --- N Department
Company 1 --- N Person
Department 1 --- N Person
Person 1 --- 0..1 AccessAccount
Person 1 --- N Person (gestor -> liderados)
Cycle 1 --- N Feedback
FormTemplate 1 --- N FormQuestion
Feedback 1 --- N FeedbackAnswer
AccessAccount 1 --- N AuditEvent
```

## Restrições da migration inicial

Nem todas as regras são representáveis apenas no arquivo Prisma. A migration inicial inclui:

- `CHECK` para impedir que uma pessoa seja gestora de si mesma;
- unicidade case-insensitive para e-mail e identificador de login;
- apenas uma linha hierárquica vigente por pessoa;
- limites de nota conforme a pergunta;
- políticas de Row-Level Security como defesa adicional;
- índices para gestor, ciclo, pessoa avaliada e status;

A trilha de alterações relevantes é gravada pelos serviços transacionais depois da validação de autenticação e autorização. Os eventos registram identificadores técnicos e mudanças de estado, sem texto de feedback ou atributos pessoais além do necessário.

## Gestão da estrutura organizacional

- O RH cadastra empresas, departamentos e pessoas; a conta de acesso continua separada e sob administração técnica.
- Todo departamento selecionado para uma pessoa deve pertencer à empresa selecionada e ambos precisam estar ativos.
- Gestores são referenciados por `Person.id`; autoâncora, ciclos e referências desconhecidas são rejeitados.
- Cada cadastro de pessoa inicia uma linha no histórico de liderança. A troca de gestor encerra a linha vigente e cria outra na mesma transação.
- Uma pessoa com liderados ativos não pode ser desativada antes da realocação da equipe.
- Uma pessoa com conta ainda habilitada não pode ser desativada; a conta deve ser desabilitada antes pelo Administrador do Sistema.
- Atualizações usam o campo `version` para detectar edições concorrentes.

## Importação

1. Converter a planilha validada para uma entrada controlada sem alterar o original.
2. Executar dry-run com contagens, rejeições e amostra sem PII.
3. Resolver empresas e áreas por nomes normalizados.
4. Criar pessoas e contas sem armazenar senha em texto puro.
5. Resolver gestores em uma segunda etapa por identificador interno.
6. Executar em transação e reverter tudo se qualquer regra obrigatória falhar.
7. Registrar apenas métricas e identificadores técnicos no relatório.
