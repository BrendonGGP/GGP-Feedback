# Importacao de colaboradores

O importador le somente uma copia preenchida do modelo em `dados-privados/`.
O arquivo original nao e alterado, exibido ou enviado ao GitHub.

## Fluxo seguro

1. Use uma copia preenchida com estes cabecalhos:
   `person_key`, `full_name`, `corporate_email`, `job_title`, `employment_regime`,
   `company_name`, `department_name`, `manager_person_key`.
   Uma coluna `username` legada pode permanecer na copia, mas sera ignorada.
2. Execute o dry-run, que e o comportamento padrao:
   `npm.cmd run import:people`.
3. Revise somente as contagens de erros. O comando nao grava no banco.
4. Aplique a migration pendente no ambiente autorizado:
   `npm.cmd run prisma:migrate:deploy`.
5. Depois de um dry-run sem erros, autorize a aplicacao transacional:
   `npm.cmd run import:people -- --apply`.

## O que e criado

- empresas e departamentos sao normalizados e reativados quando necessario;
- pessoas sao criadas ou atualizadas pelo `person_key`, garantindo idempotencia;
- a hierarquia e resolvida por `manager_person_key`;
- contas de acesso sao criadas como `PENDING_ACTIVATION`, usando o `person_key`
  normalizado como `username`, sem senha conhecida e sem papeis atribuidos;
- a senha temporaria e os papeis devem ser definidos posteriormente pelo
  Administrador do Sistema.

Se qualquer validacao falhar, o `--apply` termina antes de abrir uma transacao.
Nenhum papel e inferido a partir do cargo ou do departamento.
