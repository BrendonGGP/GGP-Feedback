"""Interface de linha de comando da biblioteca de guardrails."""

from __future__ import annotations

import argparse
from collections.abc import Callable, Sequence

from .core import ValidationReport
from .database import validate_database_foundation
from .hardening import validate_local_hardening


Validator = Callable[[], ValidationReport]
VALIDATORS: dict[str, Validator] = {
    "database": validate_database_foundation,
    "hardening": validate_local_hardening,
}


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Valida os controles ativos do GGP-Feedback.")
    parser.add_argument("target", choices=VALIDATORS, help="Conjunto de controles a validar.")
    arguments = parser.parse_args(argv)

    report = VALIDATORS[arguments.target]()
    report.print()
    return 0 if report.succeeded else 1
