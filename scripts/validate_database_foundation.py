#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


schema = ROOT / "prisma" / "schema.prisma"
migration = ROOT / "prisma" / "migrations" / "20260901153000_init_supabase_schema" / "migration.sql"

for path in (schema, migration):
    if not path.is_file():
        fail(f"Required database file is missing: {path.relative_to(ROOT)}")

if schema.is_file():
    schema_text = schema.read_text(encoding="utf-8")
    datasource_start = schema_text.find("datasource db")
    datasource_end = schema_text.find("}", datasource_start)
    if datasource_start < 0 or datasource_end < 0:
        fail("Prisma schema must define a datasource named db")
    datasource_block = schema_text[datasource_start:datasource_end]
    if 'url      = env("DATABASE_URL")' not in datasource_block:
        fail("Prisma schema must reference DATABASE_URL without embedding a connection string")

if migration.is_file():
    migration_text = migration.read_text(encoding="utf-8")
    for fragment in (
        'CREATE UNIQUE INDEX "people_corporate_email_ci_key"',
        'CREATE UNIQUE INDEX "access_accounts_login_identifier_ci_key"',
        '"people_manager_not_self_check"',
        '"reporting_line_history_one_current_per_subordinate_key"',
        '"cycles_dates_check"',
        '"form_questions_rating_bounds_check"',
        'CREATE TRIGGER "feedback_answers_validate_rating"',
    ):
        if fragment not in migration_text:
            fail(f"Initial migration lacks required database control: {fragment}")

    rls_tables = (
        "companies",
        "departments",
        "people",
        "access_accounts",
        "account_role_assignments",
        "user_sessions",
        "reporting_line_history",
        "cycles",
        "form_templates",
        "form_questions",
        "cycle_form_templates",
        "feedbacks",
        "feedback_answers",
        "audit_events",
    )
    for table in rls_tables:
        if f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;' not in migration_text:
            fail(f"Initial migration does not enable RLS for: {table}")
    if "CREATE POLICY" in migration_text:
        fail("Initial migration must not add policies before authorization is implemented")

if ERRORS:
    print("DATABASE FOUNDATION VALIDATION FAILED")
    for error in ERRORS:
        print(f"- {error}")
    sys.exit(1)

print("DATABASE FOUNDATION VALIDATION OK")
print("- Prisma schema references DATABASE_URL without embedding a connection string")
print("- Initial migration preserves integrity controls and fail-closed RLS")
