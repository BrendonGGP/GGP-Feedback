#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
import sys
import tomllib
from typing import Any

DANGEROUS_APPROVALS = {"never"}
DANGEROUS_SANDBOXES = {"danger-full-access"}
DANGEROUS_PERMISSIONS = {":danger-full-access"}


def table(data: dict[str, Any], key: str) -> dict[str, Any]:
    value = data.get(key, {})
    return value if isinstance(value, dict) else {}


def audit(path: Path) -> list[str]:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    findings: list[str] = []

    approval = data.get("approval_policy")
    if approval in DANGEROUS_APPROVALS:
        findings.append(f"CRITICAL approval_policy={approval}")

    sandbox = data.get("sandbox_mode")
    default_permissions = data.get("default_permissions")
    if sandbox in DANGEROUS_SANDBOXES:
        findings.append(f"CRITICAL sandbox_mode={sandbox}")
    if default_permissions in DANGEROUS_PERMISSIONS:
        findings.append(f"CRITICAL default_permissions={default_permissions}")
    if sandbox is not None and default_permissions is not None:
        findings.append("HIGH mistura sandbox_mode com default_permissions")
    if sandbox is not None and "permissions" in data and default_permissions is not None:
        findings.append("HIGH mistura configuração legada e permission profiles")

    if data.get("allow_login_shell") is True:
        findings.append("MEDIUM allow_login_shell=true")
    if data.get("web_search") in {"live", "indexed"}:
        findings.append(f"MEDIUM web_search={data.get('web_search')}")

    workspace = table(data, "sandbox_workspace_write")
    if workspace.get("network_access") is True:
        findings.append("HIGH sandbox workspace network enabled")

    permissions = table(data, "permissions")
    for name, profile in permissions.items():
        if name == "filesystem" or not isinstance(profile, dict):
            continue
        network = table(profile, "network")
        if network.get("enabled") is True:
            findings.append(f"MEDIUM permission profile {name} has network enabled")
        if profile.get("extends") == ":danger-full-access":
            findings.append(f"CRITICAL profile {name} extends danger-full-access")

    allowed_profiles = table(data, "allowed_permission_profiles")
    if allowed_profiles.get(":danger-full-access") is True:
        findings.append("CRITICAL managed allowlist permits :danger-full-access")

    allowed_sandboxes = data.get("allowed_sandbox_modes")
    if isinstance(allowed_sandboxes, list) and "danger-full-access" in allowed_sandboxes:
        findings.append("CRITICAL managed allowlist permits danger-full-access")

    features = table(data, "features")
    if features.get("skill_mcp_dependency_install") is True:
        findings.append("MEDIUM automatic skill MCP dependency install enabled")
    if features.get("remote_plugin") is True:
        findings.append("MEDIUM remote plugin catalog enabled")
    if features.get("plugins") is True:
        findings.append("INFO plugins enabled; verify approved sources")

    history = table(data, "history")
    if history.get("persistence") == "save-all":
        findings.append("INFO history save-all enabled; verify privacy policy")

    shell_env = table(data, "shell_environment_policy")
    if shell_env.get("ignore_default_excludes") is True:
        findings.append("HIGH automatic secret-name exclusions disabled")

    if "mcp_servers" in data and table(data, "mcp_servers"):
        findings.append("INFO MCP allowlist/config is non-empty; verify every identity and tool")

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Audita baselines TOML do Codex.")
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()
    failed = False
    for path in args.paths:
        try:
            findings = audit(path)
        except Exception as exc:
            print(f"{path}: ERROR {exc}")
            failed = True
            continue
        print(f"{path}:")
        if not findings:
            print("  OK: nenhum baseline inseguro detectado")
        else:
            for finding in findings:
                print(f"  - {finding}")
                if finding.startswith(("CRITICAL", "HIGH")):
                    failed = True
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
