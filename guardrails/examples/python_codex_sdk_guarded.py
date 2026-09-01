"""Exemplo de uso local do Codex SDK com sandbox explícito.

Instalação:
    pip install openai-codex

O SDK controla o Codex local. A política de negócio e approvals continuam no backend.
"""

from __future__ import annotations

import os
from openai_codex import Codex, Sandbox

MODEL = os.environ.get("OPENAI_MODEL")


def run_read_only(prompt: str) -> str:
    with Codex() as codex:
        kwargs = {"sandbox": Sandbox.read_only}
        if MODEL:
            kwargs["model"] = MODEL
        thread = codex.thread_start(**kwargs)
        result = thread.run(prompt)
        return result.final_response


def run_workspace_change(prompt: str) -> str:
    guarded_prompt = (
        "Leia AGENTS.md e faça um preflight antes de editar. "
        "Não use rede, não leia secrets, não escreva fora do workspace e não execute ações externas.\n\n"
        + prompt
    )
    with Codex() as codex:
        kwargs = {"sandbox": Sandbox.workspace_write}
        if MODEL:
            kwargs["model"] = MODEL
        thread = codex.thread_start(**kwargs)
        result = thread.run(guarded_prompt)
        return result.final_response


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3 or sys.argv[1] not in {"read", "write"}:
        raise SystemExit("Uso: python python_codex_sdk_guarded.py read|write 'prompt'")
    fn = run_read_only if sys.argv[1] == "read" else run_workspace_change
    print(fn(sys.argv[2]))
