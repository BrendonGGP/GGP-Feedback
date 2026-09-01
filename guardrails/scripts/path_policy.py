from __future__ import annotations

from pathlib import PurePath


ALLOWED_PROTECTED_TEMPLATES = frozenset({"examples/.env.example"})


def is_protected_path(path: PurePath) -> bool:
    parts = tuple(part.casefold() for part in path.parts)
    name = parts[-1] if parts else ""

    if name == ".env" or name.startswith(".env."):
        return True
    if name.endswith((".pem", ".key")) or name.startswith("credentials"):
        return True
    if name in {"id_rsa", "id_ed25519"}:
        return True
    if any(part in {".ssh", ".aws", ".azure"} for part in parts):
        return True
    if len(parts) >= 2 and parts[-2:] == (".kube", "config"):
        return True
    return any(parts[index : index + 2] == (".config", "gcloud") for index in range(len(parts) - 1))


def is_allowed_protected_template(path: PurePath) -> bool:
    return path.as_posix().casefold() in ALLOWED_PROTECTED_TEMPLATES
