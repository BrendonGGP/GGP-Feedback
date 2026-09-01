"""Primitivas compartilhadas pelos validadores do projeto."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass
class ValidationReport:
    """Acumula falhas para exibir todos os problemas em uma única execução."""

    name: str
    success_messages: tuple[str, ...]
    errors: list[str] = field(default_factory=list)

    @property
    def succeeded(self) -> bool:
        return not self.errors

    def require(self, condition: bool, message: str) -> None:
        if not condition:
            self.errors.append(message)

    def print(self) -> None:
        status = "OK" if self.succeeded else "FAILED"
        print(f"{self.name} {status}")
        messages = self.success_messages if self.succeeded else tuple(self.errors)
        for message in messages:
            print(f"- {message}")


def read_required_text(path: Path, report: ValidationReport) -> str | None:
    """Lê UTF-8 e registra uma falha clara quando o arquivo não existe."""

    if not path.is_file():
        try:
            display_path = path.relative_to(PROJECT_ROOT)
        except ValueError:
            display_path = path
        report.errors.append(f"Required file is missing: {display_path}")
        return None
    return path.read_text(encoding="utf-8")


def require_fragments(
    text: str,
    fragments: tuple[str, ...],
    report: ValidationReport,
    message_prefix: str,
) -> None:
    """Valida uma coleção de marcadores sem interromper na primeira falha."""

    for fragment in fragments:
        report.require(fragment in text, f"{message_prefix}: {fragment}")
