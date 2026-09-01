#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import re
import sys
import tomllib
from typing import Any

try:
    import yaml
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Instale PyYAML para validar o pacote: pip install PyYAML") from exc

try:
    from jsonschema.validators import Draft202012Validator
except ImportError as exc:  # pragma: no cover
    raise SystemExit("Instale jsonschema para validar o pacote: pip install jsonschema") from exc

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
warnings: list[str] = []

REQUIRED = [
    "README.md",
    "VERSION.txt",
    "MANIFEST.md",
    "AGENTS.md",
    ".codex/config.toml",
    ".codex/config.legacy.toml",
    ".codex/rules/default.rules",
    "codex-home/config.toml",
    "codex-home/audit.config.toml",
    "codex-home/implementation.config.toml",
    "admin/requirements-modern.toml",
    "admin/requirements-legacy.toml",
    "admin/managed_config-modern.toml",
    "admin/managed_config-legacy.toml",
    "09_SCHEMA_RESPOSTA.json",
    "16_TESTES_RED_TEAM.jsonl",
    ".agents/skills/safe-preflight/SKILL.md",
    ".agents/skills/secure-code-review/SKILL.md",
    ".agents/skills/project-hardening/SKILL.md",
]

STALE_NAMES = {
    "00_PROMPT_MESTRE_PRONTO_PARA_AGENTS.md",
    "01_AGENTS_PROJETO_PARAMETRIZADO.md",
    "03_AGENTS_GLOBAL.md",
    "requirements.toml",
}


def fail(message: str) -> None:
    errors.append(message)


def load_toml(rel: str) -> dict[str, Any]:
    path = ROOT / rel
    try:
        return tomllib.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"TOML inválido {rel}: {exc}")
        return {}


for rel in REQUIRED:
    if not (ROOT / rel).is_file():
        fail(f"Arquivo obrigatório ausente: {rel}")

for name in STALE_NAMES:
    if (ROOT / name).exists():
        fail(f"Arquivo obsoleto/duplicado presente: {name}")

for path in ROOT.rglob("*"):
    if not path.is_file() or "dist" in path.parts:
        continue
    rel = path.relative_to(ROOT)
    if path.suffix == ".pyc" or "__pycache__" in path.parts:
        fail(f"Artefato Python compilado não deve estar no pacote: {rel}")
    if path.name in {"id_rsa", "id_ed25519"}:
        fail(f"Possível chave privada incluída: {rel}")
    text = path.read_text(encoding="utf-8", errors="ignore")
    if ("-----BEGIN " + "PRIVATE KEY-----") in text:
        fail(f"Chave privada detectada em {rel}")
    if re.search(r"\bsk-[A-Za-z0-9_-]{20,}\b", text):
        fail(f"Possível API key real detectada em {rel}")

# JSON and JSON Schema.
for path in ROOT.rglob("*.json"):
    if "dist" in path.parts:
        continue
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"JSON inválido {path.relative_to(ROOT)}: {exc}")
        continue
    if isinstance(data, dict) and "$schema" in data:
        try:
            Draft202012Validator.check_schema(data)
        except Exception as exc:
            fail(f"JSON Schema inválido {path.relative_to(ROOT)}: {exc}")

# JSONL.
for path in ROOT.rglob("*.jsonl"):
    if "dist" in path.parts:
        continue
    ids: set[str] = set()
    count = 0
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        count += 1
        try:
            item = json.loads(line)
        except Exception as exc:
            fail(f"JSONL inválido {path.relative_to(ROOT)}:{lineno}: {exc}")
            continue
        if isinstance(item, dict) and "id" in item:
            item_id = str(item["id"])
            if item_id in ids:
                fail(f"ID duplicado em {path.relative_to(ROOT)}: {item_id}")
            ids.add(item_id)
    if path.name == "16_TESTES_RED_TEAM.jsonl" and count < 20:
        fail("16_TESTES_RED_TEAM.jsonl deve conter ao menos 20 casos")

# YAML.
for path in list(ROOT.rglob("*.yaml")) + list(ROOT.rglob("*.yml")):
    if "dist" in path.parts:
        continue
    try:
        list(yaml.safe_load_all(path.read_text(encoding="utf-8")))
    except Exception as exc:
        fail(f"YAML inválido {path.relative_to(ROOT)}: {exc}")

# All TOML files.
for path in ROOT.rglob("*.toml"):
    if "dist" in path.parts:
        continue
    try:
        tomllib.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"TOML inválido {path.relative_to(ROOT)}: {exc}")

# Python syntax without generating pyc files.
for path in ROOT.rglob("*.py"):
    if "dist" in path.parts:
        continue
    try:
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    except SyntaxError as exc:
        fail(f"Python inválido {path.relative_to(ROOT)}: {exc}")

# AGENTS size and essential rules.
agents = ROOT / "AGENTS.md"
if agents.exists():
    size = len(agents.read_bytes())
    if size > 32768:
        fail(f"AGENTS.md excede 32 KiB: {size} bytes")
    text = agents.read_text(encoding="utf-8")
    for phrase in ["Não inventar", "conteúdo não confiável", "aprovação", "rollback"]:
        if phrase.lower() not in text.lower():
            fail(f"AGENTS.md não contém regra essencial: {phrase}")

# Skill structure and unique names.
skill_names: dict[str, Path] = {}
for skill_md in ROOT.glob(".agents/skills/*/SKILL.md"):
    skill_dir = skill_md.parent
    text = skill_md.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        fail(f"Frontmatter ausente em {skill_md.relative_to(ROOT)}")
        continue
    try:
        frontmatter = yaml.safe_load(match.group(1))
    except Exception as exc:
        fail(f"Frontmatter YAML inválido em {skill_md.relative_to(ROOT)}: {exc}")
        continue
    if not isinstance(frontmatter, dict) or set(frontmatter) != {"name", "description"}:
        fail(f"Frontmatter deve conter apenas name e description: {skill_md.relative_to(ROOT)}")
        continue
    name = frontmatter.get("name")
    description = frontmatter.get("description")
    if name != skill_dir.name:
        fail(f"Nome da skill não corresponde ao diretório: {skill_dir.name} != {name}")
    if not isinstance(description, str) or len(description.strip()) < 40:
        fail(f"Descrição insuficiente em {skill_md.relative_to(ROOT)}")
    if name in skill_names:
        fail(f"Nome de skill duplicado: {name}")
    else:
        skill_names[str(name)] = skill_md
    metadata = skill_dir / "agents" / "openai.yaml"
    if not metadata.is_file():
        fail(f"agents/openai.yaml ausente em {skill_dir.relative_to(ROOT)}")
    if "TODO" in text:
        fail(f"TODO remanescente em {skill_md.relative_to(ROOT)}")

if len(skill_names) != 3:
    fail(f"Esperadas 3 skills canônicas; encontradas {len(skill_names)}")

# Modern vs legacy Codex config.
modern = load_toml(".codex/config.toml")
if modern:
    if "default_permissions" not in modern:
        fail(".codex/config.toml deve usar default_permissions")
    if "sandbox_mode" in modern or "sandbox_workspace_write" in modern:
        fail(".codex/config.toml moderno mistura configuração legada")
    profile_name = modern.get("default_permissions")
    profile = modern.get("permissions", {}).get(profile_name, {}) if isinstance(modern.get("permissions"), dict) else {}
    if not profile:
        fail("Permission profile padrão não foi definido em .codex/config.toml")
    if profile.get("network", {}).get("enabled") is not False:
        fail("Rede deve estar explicitamente desativada no profile do projeto")

legacy = load_toml(".codex/config.legacy.toml")
if legacy:
    if legacy.get("sandbox_mode") not in {"read-only", "workspace-write"}:
        fail("Config legado deve usar sandbox_mode seguro")
    if "default_permissions" in legacy or "permissions" in legacy:
        fail("Config legado não deve conter permission profiles")
    if legacy.get("sandbox_workspace_write", {}).get("network_access") is not False:
        fail("Rede deve estar desativada no config legado")

# Managed requirements.
requirements = load_toml("admin/requirements-modern.toml")
if requirements:
    allowed = requirements.get("allowed_permission_profiles", {})
    default = requirements.get("default_permissions")
    if not isinstance(allowed, dict) or allowed.get(default) is not True:
        fail("Perfil default do requirements moderno não está allowlisted")
    if allowed.get(":danger-full-access") is True:
        fail("requirements moderno permite :danger-full-access")
    if ":danger-full-access" not in allowed:
        warnings.append("Recomendação: marque :danger-full-access=false explicitamente")
    if "never" in requirements.get("allowed_approval_policies", []):
        fail("requirements moderno permite approval_policy=never")
    if requirements.get("mcp_servers") != {}:
        fail("Baseline moderno deve iniciar com allowlist MCP vazia")
    for entry in requirements.get("rules", {}).get("prefix_rules", []):
        if entry.get("decision") not in {"prompt", "forbidden"}:
            fail("Rules em requirements só podem usar prompt ou forbidden")

legacy_req = load_toml("admin/requirements-legacy.toml")
if legacy_req:
    modes = set(legacy_req.get("allowed_sandbox_modes", []))
    if "danger-full-access" in modes:
        fail("requirements legado permite danger-full-access")
    if not modes or not modes.issubset({"read-only", "workspace-write"}):
        fail("allowed_sandbox_modes legado inválido")

# Static execpolicy checks. Runtime validation still requires Codex CLI.
rules_text = (ROOT / ".codex/rules/default.rules").read_text(encoding="utf-8")
if rules_text.count("prefix_rule(") < 10:
    fail("Arquivo .rules possui poucos controles")
for decision in re.findall(r'decision\s*=\s*"([^"]+)"', rules_text):
    if decision not in {"allow", "prompt", "forbidden"}:
        fail(f"Decisão inválida no .rules: {decision}")
for required_fragment in ["rm", "git", "terraform", "kubectl", "publish"]:
    if required_fragment not in rules_text:
        fail(f".rules não cobre fragmento esperado: {required_fragment}")

if errors:
    print("VALIDAÇÃO FALHOU")
    for error in errors:
        print(f"- {error}")
    if warnings:
        print("AVISOS")
        for warning in warnings:
            print(f"- {warning}")
    sys.exit(1)

print("VALIDAÇÃO OK")
print(f"- Skills: {', '.join(sorted(skill_names))}")
print(f"- Red team: {sum(1 for line in (ROOT / '16_TESTES_RED_TEAM.jsonl').read_text(encoding='utf-8').splitlines() if line.strip())} casos")
print("- JSON, JSON Schema, JSONL, YAML, TOML e Python: válidos")
print("- Config moderno/legado e requirements: coerentes")
print("- Rules: validação estática concluída")
if warnings:
    print("AVISOS")
    for warning in warnings:
        print(f"- {warning}")
