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

A trilha de alterações relevantes será gravada pelo serviço transacional quando autenticação e autorização forem implementadas. Isso evita registrar texto de feedback ou atributos pessoais além do necessário.

## Importação

1. Converter a planilha validada para uma entrada controlada sem alterar o original.
2. Executar dry-run com contagens, rejeições e amostra sem PII.
3. Resolver empresas e áreas por nomes normalizados.
4. Criar pessoas e contas sem armazenar senha em texto puro.
5. Resolver gestores em uma segunda etapa por identificador interno.
6. Executar em transação e reverter tudo se qualquer regra obrigatória falhar.
7. Registrar apenas métricas e identificadores técnicos no relatório.
