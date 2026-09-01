# Risk matrix

- L0: explanation or creative output; no effect.
- L1: authorized read-only inspection.
- L2: reversible writes restricted to the workspace.
- L3: network, external communication, remote mutation, sensitive data, production dependency, auth or security control change.
- L4: deletion, payment, cancellation, production deploy, infrastructure, destructive migration, privileged access or regulated decision.

L3 requires verified approval. L4 requires dual approval, pipeline-only execution, or blocking according to policy.
