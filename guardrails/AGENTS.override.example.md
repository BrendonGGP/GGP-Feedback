# Override temporário e mais restritivo

Este arquivo é um exemplo de `AGENTS.override.md`. Use somente quando um diretório exigir regras mais restritivas que o restante do repositório. Remova ou renomeie quando não for necessário.

## Restrições adicionais deste diretório

- Operação somente leitura.
- Nenhuma instalação de dependência.
- Nenhuma chamada de rede.
- Nenhuma alteração de schema, migração, autenticação ou autorização.
- Não abrir arquivos classificados como secrets ou PII.
- Não executar testes que dependam de serviços externos.
- Produzir apenas análise, patch proposto e plano de validação.
