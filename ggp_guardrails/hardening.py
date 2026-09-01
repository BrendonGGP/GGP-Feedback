"""Validação dos controles ativos de segurança e supply chain."""

from __future__ import annotations

import json
from pathlib import Path
import re
import tomllib
from typing import Any

import yaml

from .core import PROJECT_ROOT, ValidationReport, read_required_text, require_fragments


REQUIRED_FILES = (
    "AGENTS.md",
    "docs/AI_CONTEXT.md",
    ".gitignore",
    ".codex/config.toml",
    ".codex/rules/default.rules",
    "05_CONFIGURACAO_PROJETO.yaml",
    "06_POLITICA_FERRAMENTAS.yaml",
    "07_POLITICA_MCP.yaml",
    "15_POLITICA_APROVACAO_HUMANA.yaml",
    ".github/workflows/ai-security-baseline.yml",
    ".node-version",
    "package.json",
    "package-lock.json",
    "prisma/migrations/migration_lock.toml",
    "prisma/migrations/20260901153000_init_supabase_schema/migration.sql",
    "docs/SUPABASE.md",
    "ggp_guardrails/__main__.py",
)

ACTIVE_POLICY_FILES = (
    "05_CONFIGURACAO_PROJETO.yaml",
    "06_POLITICA_FERRAMENTAS.yaml",
    "07_POLITICA_MCP.yaml",
    "15_POLITICA_APROVACAO_HUMANA.yaml",
)

WORKFLOW_CONTROLS = (
    "runs-on: ubuntu-24.04",
    "actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903",
    'node-version: "24.18.0"',
    "npm ci --ignore-scripts --audit=false --fund=false",
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm audit --omit=dev --audit-level=high",
    "npm run build",
    "npm run prisma:validate",
    "npm run prisma:generate",
    "npm run prisma:migrate:diff",
    "npm run validate:database",
    "npm run validate:hardening",
    'python-version: "3.14.7"',
    "persist-credentials: false",
    "--only-binary=:all:",
    "--require-hashes",
    "python -B guardrails/scripts/validate_package.py",
    "python -B -m unittest discover -s guardrails/tests -v",
    "python -B -m unittest discover -s tests/python -v",
    'branches: ["**"]',
)

EXPECTED_DEPENDENCIES = {
    "@prisma/client": "6.12.0",
    "prisma": "6.12.0",
}

REQUIRED_PACKAGE_SCRIPTS = (
    "prisma:validate",
    "prisma:generate",
    "prisma:migrate:diff",
    "prisma:migrate:deploy",
    "validate:database",
    "validate:hardening",
)


def _load_json(path: Path, report: ValidationReport) -> dict[str, Any]:
    text = read_required_text(path, report)
    if text is None:
        return {}
    try:
        value = json.loads(text)
    except Exception as exc:
        report.errors.append(f"Invalid JSON {path.name}: {exc}")
        return {}
    if not isinstance(value, dict):
        report.errors.append(f"JSON root must be an object: {path.name}")
        return {}
    return value


def _validate_agents(root: Path, report: ValidationReport) -> None:
    path = root / "AGENTS.md"
    text = read_required_text(path, report)
    if text is None:
        return
    report.require(len(path.read_bytes()) <= 32768, "AGENTS.md exceeds 32 KiB")
    required_rules = ("Não inventar", "não confiável", "aprovação", "rollback")
    for phrase in required_rules:
        report.require(
            phrase.casefold() in text.casefold(),
            f"AGENTS.md lacks required rule: {phrase}",
        )


def _validate_active_policies(root: Path, report: ValidationReport) -> None:
    placeholder = re.compile(r"\{\{[^{}]+\}\}")
    for relative in ACTIVE_POLICY_FILES:
        path = root / relative
        text = read_required_text(path, report)
        if text is None:
            continue
        report.require(not placeholder.search(text), f"Unresolved placeholder in {relative}")
        try:
            yaml.safe_load(text)
        except Exception as exc:
            report.errors.append(f"Invalid YAML {relative}: {exc}")


def _validate_codex_config(root: Path, report: ValidationReport) -> None:
    text = read_required_text(root / ".codex/config.toml", report)
    if text is None:
        return
    try:
        data = tomllib.loads(text)
    except Exception as exc:
        report.errors.append(f"Invalid .codex/config.toml: {exc}")
        return
    report.require(data.get("approval_policy") == "on-request", "approval_policy must be on-request")
    report.require(
        data.get("default_permissions") == "project_guarded_workspace",
        "default_permissions must be project_guarded_workspace",
    )
    profile = data.get("permissions", {}).get("project_guarded_workspace", {})
    report.require(
        profile.get("network", {}).get("enabled") is False,
        "project_guarded_workspace network must be disabled",
    )


def _validate_execpolicy(root: Path, report: ValidationReport) -> None:
    text = read_required_text(root / ".codex/rules/default.rules", report)
    if text is None:
        return
    report.require(text.count("prefix_rule(") >= 10, "Execpolicy must contain at least 10 prefix rules")
    for decision in re.findall(r'decision\s*=\s*"([^"]+)"', text):
        report.require(
            decision in {"allow", "prompt", "forbidden"},
            f"Invalid execpolicy decision: {decision}",
        )
    require_fragments(
        text,
        ("rm", "git", "terraform", "kubectl", "publish"),
        report,
        "Execpolicy does not cover",
    )


def _validate_workflow(root: Path, report: ValidationReport) -> None:
    text = read_required_text(root / ".github/workflows/ai-security-baseline.yml", report)
    if text is None:
        return
    for reference in re.findall(r"^\s*-?\s*uses:\s*(\S+)(?:\s+#.*)?$", text, flags=re.MULTILINE):
        if reference.startswith("./"):
            continue
        report.require(
            re.fullmatch(r"[^@\s]+@[0-9a-f]{40}", reference) is not None,
            f"GitHub Action is not pinned by commit SHA: {reference}",
        )
    require_fragments(text, WORKFLOW_CONTROLS, report, "CI workflow lacks required supply-chain control")


def _validate_package(root: Path, report: ValidationReport) -> None:
    package = _load_json(root / "package.json", report)
    report.require(package.get("private") is True, "package.json must set private to true")
    report.require(package.get("packageManager") == "npm@11.16.0", "package.json must pin npm 11.16.0")

    dependency_groups = ("dependencies", "devDependencies")
    for dependency, expected_version in EXPECTED_DEPENDENCIES.items():
        actual_version = next(
            (
                package.get(group, {}).get(dependency)
                for group in dependency_groups
                if dependency in package.get(group, {})
            ),
            None,
        )
        report.require(
            actual_version == expected_version,
            f"package.json must pin {dependency} to {expected_version}",
        )

    scripts = package.get("scripts", {})
    for script in REQUIRED_PACKAGE_SCRIPTS:
        report.require(script in scripts, f"package.json lacks required script: {script}")

    for group in dependency_groups:
        for dependency, version in package.get(group, {}).items():
            report.require(
                re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version) is not None,
                f"{group} must pin {dependency} to an exact version: {version}",
            )

    lock = _load_json(root / "package-lock.json", report)
    report.require(lock.get("lockfileVersion") == 3, "package-lock.json must use lockfile version 3")


def _validate_runtime_and_python(root: Path, report: ValidationReport) -> None:
    node_version = read_required_text(root / ".node-version", report)
    if node_version is not None:
        report.require(node_version.strip() == "24.18.0", ".node-version must pin Node.js 24.18.0")

    requirements = read_required_text(root / "requirements-validation.txt", report)
    if requirements is not None:
        pinned = [
            line
            for line in requirements.splitlines()
            if line.strip() and not line.lstrip().startswith("#") and "==" in line
        ]
        report.require(
            bool(pinned) and all(line.rstrip().endswith("\\") for line in pinned),
            "Validation requirements must be pinned and followed by hashes",
        )
        report.require(
            requirements.count("--hash=sha256:") >= len(pinned),
            "Validation requirements do not provide enough SHA-256 hashes",
        )


def _validate_skills(root: Path, report: ValidationReport) -> None:
    for skill in ("safe-preflight", "secure-code-review", "project-hardening"):
        skill_root = root / ".agents/skills" / skill
        report.require((skill_root / "SKILL.md").is_file(), f"Missing SKILL.md for {skill}")
        report.require((skill_root / "references").is_dir(), f"Missing references directory for {skill}")


def validate_local_hardening(root: Path = PROJECT_ROOT) -> ValidationReport:
    """Executa os controles ativos sem modificar o workspace."""

    report = ValidationReport(
        name="LOCAL HARDENING VALIDATION",
        success_messages=(
            "Active policies contain no unresolved placeholders",
            "Instructions, Codex config, execpolicy and validation library are coherent",
        ),
    )
    for relative in REQUIRED_FILES:
        report.require((root / relative).is_file(), f"Required file is missing: {relative}")
    _validate_agents(root, report)
    _validate_active_policies(root, report)
    _validate_codex_config(root, report)
    _validate_execpolicy(root, report)
    _validate_workflow(root, report)
    _validate_package(root, report)
    _validate_runtime_and_python(root, report)
    _validate_skills(root, report)
    return report
