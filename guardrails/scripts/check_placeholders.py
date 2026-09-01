from __future__ import annotations

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
IGNORE = {"dist"}
pattern = re.compile(r"\{\{[^{}]+\}\}")
found: dict[str, list[str]] = {}
for path in ROOT.rglob("*"):
    if not path.is_file() or any(part in IGNORE for part in path.parts):
        continue
    if path.suffix.lower() not in {".md", ".txt", ".yaml", ".yml", ".json", ".toml", ".py", ".rules"}:
        continue
    text = path.read_text(encoding="utf-8", errors="ignore")
    matches = sorted(set(pattern.findall(text)))
    if matches:
        found[str(path.relative_to(ROOT))] = matches

if found:
    print("Placeholders a personalizar:")
    for name, values in sorted(found.items()):
        print(f"- {name}: {', '.join(values)}")
else:
    print("Nenhum placeholder encontrado.")
