#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
import sys
import tomllib

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required: python -m pip install PyYAML") from exc


ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []

REQUIRED = [
    "AGENTS.md",
    ".gitignore",
    ".codex/config.toml",
    ".codex/rules/default.rules",
    "05_CONFIGURACAO_PROJETO.yaml",
    "06_POLITICA_FERRAMENTAS.yaml",
    "07_POLITICA_MCP.yaml",
    "15_POLITICA_APROVACAO_HUMANA.yaml",
    ".github/workflows/ai-security-baseline.yml",
    ".github/workflows/auto-pull-request.yml",
    ".node-version",
    "package.json",
    "package-lock.json",
]


def fail(message: str) -> None:
    ERRORS.append(message)


for relative in REQUIRED:
    if not (ROOT / relative).is_file():
        fail(f"Required file is missing: {relative}")

agents = ROOT / "AGENTS.md"
if agents.is_file():
    if len(agents.read_bytes()) > 32768:
        fail("AGENTS.md exceeds 32 KiB")
    agents_text = agents.read_text(encoding="utf-8")
    for phrase in ("Não inventar", "não confiável", "aprovação", "rollback"):
        if phrase.casefold() not in agents_text.casefold():
            fail(f"AGENTS.md lacks required rule: {phrase}")

active_policy_files = [
    ROOT / "05_CONFIGURACAO_PROJETO.yaml",
    ROOT / "06_POLITICA_FERRAMENTAS.yaml",
    ROOT / "07_POLITICA_MCP.yaml",
    ROOT / "15_POLITICA_APROVACAO_HUMANA.yaml",
]
placeholder = re.compile(r"\{\{[^{}]+\}\}")
for path in active_policy_files:
    if not path.is_file():
        continue
    text = path.read_text(encoding="utf-8")
    if placeholder.search(text):
        fail(f"Unresolved placeholder in {path.relative_to(ROOT)}")
    try:
        yaml.safe_load(text)
    except Exception as exc:
        fail(f"Invalid YAML {path.relative_to(ROOT)}: {exc}")

config = ROOT / ".codex" / "config.toml"
if config.is_file():
    try:
        data = tomllib.loads(config.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid .codex/config.toml: {exc}")
        data = {}
    if data.get("approval_policy") != "on-request":
        fail("approval_policy must be on-request")
    if data.get("default_permissions") != "project_guarded_workspace":
        fail("default_permissions must be project_guarded_workspace")
    profile = data.get("permissions", {}).get("project_guarded_workspace", {})
    if profile.get("network", {}).get("enabled") is not False:
        fail("project_guarded_workspace network must be disabled")

rules = ROOT / ".codex" / "rules" / "default.rules"
if rules.is_file():
    text = rules.read_text(encoding="utf-8")
    if text.count("prefix_rule(") < 10:
        fail("Execpolicy must contain at least 10 prefix rules")
    for decision in re.findall(r'decision\s*=\s*"([^"]+)"', text):
        if decision not in {"allow", "prompt", "forbidden"}:
            fail(f"Invalid execpolicy decision: {decision}")
    for fragment in ("rm", "git", "terraform", "kubectl", "publish"):
        if fragment not in text:
            fail(f"Execpolicy does not cover: {fragment}")

workflow = ROOT / ".github" / "workflows" / "ai-security-baseline.yml"
if workflow.is_file():
    workflow_text = workflow.read_text(encoding="utf-8")
    for reference in re.findall(
        r"^\s*-?\s*uses:\s*(\S+)(?:\s+#.*)?$", workflow_text, flags=re.MULTILINE
    ):
        if reference.startswith("./"):
            continue
        if not re.fullmatch(r"[^@\s]+@[0-9a-f]{40}", reference):
            fail(f"GitHub Action is not pinned by commit SHA: {reference}")
    for fragment in (
        "runs-on: ubuntu-24.04",
        "actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903",
        'node-version: "24.18.0"',
        "npm ci --ignore-scripts --audit=false --fund=false",
        "npm run lint",
        "npm run typecheck",
        "npm test",
        "npm audit --omit=dev --audit-level=high",
        "npm run build",
        'python-version: "3.14.7"',
        "persist-credentials: false",
        "--only-binary=:all:",
        "--require-hashes",
        "python -B scripts/validate_local_hardening.py",
        "python -B guardrails/scripts/validate_package.py",
        "python -B -m unittest discover -s guardrails/tests -v",
        'branches: ["**"]',
    ):
        if fragment not in workflow_text:
            fail(f"CI workflow lacks required supply-chain control: {fragment}")

auto_pr_workflow = ROOT / ".github" / "workflows" / "auto-pull-request.yml"
if auto_pr_workflow.is_file():
    auto_pr_text = auto_pr_workflow.read_text(encoding="utf-8")
    for reference in re.findall(
        r"^\s*-?\s*uses:\s*(\S+)(?:\s+#.*)?$",
        auto_pr_text,
        flags=re.MULTILINE,
    ):
        if reference.startswith("./"):
            continue
        if not re.fullmatch(r"[^@\s]+@[0-9a-f]{40}", reference):
            fail(f"GitHub Action is not pinned by commit SHA: {reference}")
    for fragment in (
        "branches-ignore: [main]",
        "contents: read",
        "pull-requests: write",
        "runs-on: ubuntu-24.04",
        "timeout-minutes: 5",
        "GH_TOKEN: ${{ github.token }}",
        'existing="$(gh pr list',
        "gh pr create",
    ):
        if fragment not in auto_pr_text:
            fail(f"Automatic PR workflow lacks required control: {fragment}")
    if "contents: write" in auto_pr_text:
        fail("Automatic PR workflow must not grant contents: write")

package_file = ROOT / "package.json"
if package_file.is_file():
    try:
        package_data = json.loads(package_file.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid package.json: {exc}")
        package_data = {}
    if package_data.get("private") is not True:
        fail("package.json must set private to true")
    if package_data.get("packageManager") != "npm@11.16.0":
        fail("package.json must pin npm 11.16.0")
    for group in ("dependencies", "devDependencies"):
        for dependency, version in package_data.get(group, {}).items():
            if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version):
                fail(f"{group} must pin {dependency} to an exact version: {version}")

node_version = ROOT / ".node-version"
if node_version.is_file() and node_version.read_text(encoding="utf-8").strip() != "24.18.0":
    fail(".node-version must pin Node.js 24.18.0")

package_lock = ROOT / "package-lock.json"
if package_lock.is_file():
    try:
        lock_data = json.loads(package_lock.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Invalid package-lock.json: {exc}")
        lock_data = {}
    if lock_data.get("lockfileVersion") != 3:
        fail("package-lock.json must use lockfile version 3")

validation_lock = ROOT / "requirements-validation.txt"
if validation_lock.is_file():
    lock_text = validation_lock.read_text(encoding="utf-8")
    requirements = [
        line for line in lock_text.splitlines()
        if line.strip() and not line.lstrip().startswith("#") and "==" in line
    ]
    if not requirements or any(not line.rstrip().endswith("\\") for line in requirements):
        fail("Validation requirements must be pinned and followed by hashes")
    if lock_text.count("--hash=sha256:") < len(requirements):
        fail("Validation requirements do not provide enough SHA-256 hashes")

for skill in ("safe-preflight", "secure-code-review", "project-hardening"):
    skill_root = ROOT / ".agents" / "skills" / skill
    if not (skill_root / "SKILL.md").is_file():
        fail(f"Missing SKILL.md for {skill}")
    if not (skill_root / "references").is_dir():
        fail(f"Missing references directory for {skill}")

if ERRORS:
    print("LOCAL HARDENING VALIDATION FAILED")
    for error in ERRORS:
        print(f"- {error}")
    sys.exit(1)

print("LOCAL HARDENING VALIDATION OK")
print("- Active policies contain no unresolved placeholders")
print("- AGENTS, Codex config, execpolicy and skill structure are coherent")
