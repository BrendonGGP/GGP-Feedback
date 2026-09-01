# Exemplos de implementação

- `python_openai_guarded.py`: Responses API, Structured Outputs, filtro de entrada e verificador factual.
- `python_agents_sdk_guardrails.py`: input guardrail e tool que exige approval.
- `python_codex_sdk_guarded.py`: Codex SDK em modo read-only ou workspace-write.
- `tool_policy_enforcer.py`: autorização determinística fora do modelo.
- `promptfoo.example.yaml`: regressão adversarial inicial.

## Dependências

Instale somente em ambiente isolado e fixe versões depois de testar:

```bash
pip install openai pydantic PyYAML jsonschema
pip install openai-agents       # exemplo Agents SDK
pip install openai-codex        # exemplo Codex SDK
```

Os exemplos são baselines educacionais. Antes de produção, acrescente autenticação real, autorização por registro, segregação por tenant, secret manager, rate limit, tracing, approval assinado, idempotência, reconciliação, testes e tratamento de falhas parciais.
