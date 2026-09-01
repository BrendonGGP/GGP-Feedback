"""Exemplo mínimo de pipeline guardado com OpenAI Responses API.

Este exemplo NÃO executa tools. Autorização, approval tokens, tenancy e efeitos
externos devem permanecer no backend. Use Structured Outputs para reduzir erros
de formato; isso não prova factualidade.
"""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Literal, TypeVar

from openai import OpenAI
from pydantic import BaseModel, ConfigDict, Field

ROOT = Path(__file__).resolve().parents[1]
POLICIES = ROOT

MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.6")
GUARD_MODEL = os.environ.get("OPENAI_GUARD_MODEL", MODEL)

T = TypeVar("T", bound=BaseModel)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class InputGuardVerdict(StrictModel):
    decision: Literal["ALLOW", "SANITIZE", "HUMAN_REVIEW", "BLOCK"]
    risk_level: Literal["L0", "L1", "L2", "L3", "L4"]
    detected_categories: list[
        Literal[
            "direct_prompt_injection",
            "jailbreak",
            "secret_exfiltration",
            "cross_tenant_access",
            "identity_or_approval_spoofing",
            "dangerous_action",
            "code_or_command_injection",
            "pii_or_sensitive_data",
            "policy_evasion_obfuscation",
            "benign",
        ]
    ]
    reason_codes: list[str]
    sanitized_input: str
    requires_human_review: bool
    log_security_event: bool


class Claim(StrictModel):
    text: str
    support: Literal[
        "supported",
        "partially_supported",
        "unsupported",
        "contradicted",
        "not_factual",
    ]
    evidence_ids: list[str]
    note: str


class Source(StrictModel):
    source_id: str
    title: str
    version: str
    locator: str
    retrieved_at: str


class ProposedAction(StrictModel):
    tool_name: str
    arguments_summary: str
    risk_level: Literal["L0", "L1", "L2", "L3", "L4"]
    requires_approval: bool
    approval_reason: str


class UniversalAnswerEnvelope(StrictModel):
    status: Literal[
        "OK",
        "INSUFFICIENT_EVIDENCE",
        "NEEDS_CLARIFICATION",
        "NEEDS_HUMAN_APPROVAL",
        "BLOCKED",
        "ERROR",
    ]
    answer: str
    basis: Literal[
        "authorized_sources",
        "verified_tool_result",
        "deterministic_calculation",
        "general_reasoning",
        "creative_generation",
        "none",
    ]
    risk_level: Literal["L0", "L1", "L2", "L3", "L4"]
    confidence: Literal["high", "medium", "low", "not_applicable"]
    claims: list[Claim]
    sources: list[Source]
    assumptions: list[str]
    warnings: list[str]
    proposed_actions: list[ProposedAction]
    injection_detected: bool
    privacy_redactions_applied: bool


class ClaimResult(StrictModel):
    claim: str
    status: Literal[
        "supported",
        "partially_supported",
        "unsupported",
        "contradicted",
        "not_factual",
    ]
    evidence_ids: list[str]
    explanation: str


class OutputVerification(StrictModel):
    decision: Literal[
        "PASS",
        "REVISE",
        "INSUFFICIENT_EVIDENCE",
        "NEEDS_CLARIFICATION",
        "NEEDS_HUMAN_APPROVAL",
        "BLOCK",
    ]
    verified_answer: str
    claim_results: list[ClaimResult]
    missing_evidence: list[str]
    conflicts: list[str]
    invalid_citations: list[str]
    requires_human_review: bool
    injection_detected_in_evidence: bool


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_fenced_xml(markdown: str) -> str:
    match = re.search(r"```xml\s*(.*?)\s*```", markdown, flags=re.DOTALL)
    if not match:
        raise ValueError("Bloco XML não encontrado no prompt.")
    return match.group(1)


def render(template: str, values: dict[str, str]) -> str:
    rendered = template
    for key, value in values.items():
        rendered = rendered.replace("{{" + key + "}}", value)
    return rendered


def call_structured(
    client: OpenAI,
    *,
    model: str,
    instructions: str,
    payload: dict[str, object],
    output_type: type[T],
) -> T:
    response = client.responses.parse(
        model=model,
        instructions=instructions,
        input=json.dumps(payload, ensure_ascii=False),
        text_format=output_type,
        store=False,
    )
    parsed = response.output_parsed
    if parsed is None:
        # Refusals e respostas interrompidas precisam de tratamento explícito.
        detail = getattr(response, "output_text", "") or "sem conteúdo estruturado"
        raise RuntimeError(f"Resposta não estruturada/recusada: {detail}")
    return parsed


def deterministic_block(
    *, status: Literal["BLOCKED", "NEEDS_HUMAN_APPROVAL"], reason: str, risk: str
) -> UniversalAnswerEnvelope:
    return UniversalAnswerEnvelope(
        status=status,
        answer=reason,
        basis="none",
        risk_level=risk,  # type: ignore[arg-type]
        confidence="not_applicable",
        claims=[],
        sources=[],
        assumptions=[],
        warnings=[reason],
        proposed_actions=[],
        injection_detected=status == "BLOCKED",
        privacy_redactions_applied=False,
    )


def guarded_answer(
    user_request: str,
    evidence_set: list[dict[str, object]],
) -> UniversalAnswerEnvelope:
    client = OpenAI()

    filter_prompt = read_text(POLICIES / "10_PROMPT_FILTRO_ENTRADA.md")
    guard = call_structured(
        client,
        model=GUARD_MODEL,
        instructions=filter_prompt,
        payload={"untrusted_input": user_request},
        output_type=InputGuardVerdict,
    )

    if guard.decision == "BLOCK":
        return deterministic_block(
            status="BLOCKED",
            reason="A solicitação foi bloqueada pela política de segurança.",
            risk=guard.risk_level,
        )

    if guard.decision == "HUMAN_REVIEW":
        return deterministic_block(
            status="NEEDS_HUMAN_APPROVAL",
            reason="Esta solicitação exige revisão humana antes de qualquer execução.",
            risk=guard.risk_level,
        )

    safe_request = guard.sanitized_input if guard.decision == "SANITIZE" else user_request

    system_markdown = read_text(ROOT / "02_SYSTEM_PROMPT_OPENAI_API.md")
    system_template = extract_fenced_xml(system_markdown)
    system_prompt = render(
        system_template,
        {
            "PROJECT_NAME": os.environ.get("PROJECT_NAME", "Projeto exemplo"),
            "PROJECT_PURPOSE": os.environ.get(
                "PROJECT_PURPOSE", "Responder com base em fontes autorizadas"
            ),
            "DOMAIN": os.environ.get("DOMAIN", "software"),
            "LANGUAGE": os.environ.get("LANGUAGE", "pt-BR"),
            "CURRENT_DATE": os.environ.get("CURRENT_DATE", "não fornecida"),
            "TIMEZONE": os.environ.get("TIMEZONE", "UTC"),
            "TENANT_ID": os.environ.get("TENANT_ID", "tenant_example"),
            "USER_ID": os.environ.get("USER_ID", "user_example"),
            "USER_ROLE": os.environ.get("USER_ROLE", "user"),
            "ENVIRONMENT": os.environ.get("ENVIRONMENT", "development"),
            "AUTHORIZED_SOURCES": "Somente evidence_set enviado pelo backend.",
            "APPROVAL_POLICY": "L3 exige aprovação; L4 exige dupla aprovação ou bloqueio.",
            "TOOL_POLICY": "Nenhuma tool está habilitada neste exemplo.",
            "PROJECT_SPECIFIC_RULES": "Não executar efeitos externos.",
        },
    )

    candidate = call_structured(
        client,
        model=MODEL,
        instructions=system_prompt,
        payload={
            "user_request": safe_request,
            "evidence_set": evidence_set,
            "grounding_required": bool(evidence_set),
            "instruction": "Responda apenas com suporte do evidence_set quando grounding_required=true.",
        },
        output_type=UniversalAnswerEnvelope,
    )

    # Para fatos materiais, execute uma segunda verificação contra as evidências.
    if evidence_set and candidate.status == "OK":
        verify_prompt = read_text(POLICIES / "13_PROMPT_VERIFICADOR_SAIDA.md")
        verification = call_structured(
            client,
            model=GUARD_MODEL,
            instructions=verify_prompt,
            payload={
                "requires_grounding": True,
                "current_date": os.environ.get("CURRENT_DATE", "não fornecida"),
                "tenant_id": os.environ.get("TENANT_ID", "tenant_example"),
                "candidate_answer": candidate.model_dump(),
                "evidence_set": evidence_set,
            },
            output_type=OutputVerification,
        )

        if verification.decision != "PASS":
            candidate.answer = verification.verified_answer
            candidate.warnings.extend(verification.missing_evidence)
            candidate.warnings.extend(verification.conflicts)
            candidate.injection_detected = (
                candidate.injection_detected
                or verification.injection_detected_in_evidence
            )
            mapping = {
                "REVISE": "OK",
                "INSUFFICIENT_EVIDENCE": "INSUFFICIENT_EVIDENCE",
                "NEEDS_CLARIFICATION": "NEEDS_CLARIFICATION",
                "NEEDS_HUMAN_APPROVAL": "NEEDS_HUMAN_APPROVAL",
                "BLOCK": "BLOCKED",
            }
            candidate.status = mapping[verification.decision]  # type: ignore[assignment]

    return candidate


def main() -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("ERRO: defina OPENAI_API_KEY em um secret manager/variável de ambiente.", file=sys.stderr)
        return 2

    request = " ".join(sys.argv[1:]).strip()
    if not request:
        print('Uso: python python_openai_guarded.py "sua pergunta"', file=sys.stderr)
        return 2

    # Exemplo vazio. Em produção, o backend recupera fontes autorizadas e aplica ACL.
    evidence: list[dict[str, object]] = []

    try:
        result = guarded_answer(request, evidence)
    except Exception as exc:  # Evite vazar payloads ou secrets na mensagem.
        print(f"ERRO_CONTROLADO: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1

    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
