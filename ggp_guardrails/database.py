"""Validação estática da fundação Prisma/PostgreSQL."""

from __future__ import annotations

from pathlib import Path

from .core import PROJECT_ROOT, ValidationReport, read_required_text, require_fragments


INITIAL_MIGRATION = Path(
    "prisma/migrations/20260901153000_init_supabase_schema/migration.sql"
)

REQUIRED_DATABASE_CONTROLS = (
    'CREATE UNIQUE INDEX "people_corporate_email_ci_key"',
    'CREATE UNIQUE INDEX "access_accounts_login_identifier_ci_key"',
    '"people_manager_not_self_check"',
    '"reporting_line_history_one_current_per_subordinate_key"',
    '"cycles_dates_check"',
    '"form_questions_rating_bounds_check"',
    'CREATE TRIGGER "feedback_answers_validate_rating"',
)

RLS_TABLES = (
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


def validate_database_foundation(root: Path = PROJECT_ROOT) -> ValidationReport:
    """Confirma conexão via ambiente, integridade SQL e RLS fail-closed."""

    report = ValidationReport(
        name="DATABASE FOUNDATION VALIDATION",
        success_messages=(
            "Prisma schema references DATABASE_URL without embedding a connection string",
            "Initial migration preserves integrity controls and fail-closed RLS",
        ),
    )

    schema_text = read_required_text(root / "prisma/schema.prisma", report)
    migration_text = read_required_text(root / INITIAL_MIGRATION, report)

    if schema_text is not None:
        datasource_start = schema_text.find("datasource db")
        datasource_end = schema_text.find("}", datasource_start)
        report.require(
            datasource_start >= 0 and datasource_end >= 0,
            "Prisma schema must define a datasource named db",
        )
        datasource_block = schema_text[datasource_start:datasource_end]
        report.require(
            'url      = env("DATABASE_URL")' in datasource_block,
            "Prisma schema must reference DATABASE_URL without embedding a connection string",
        )
        normalized_schema = schema_text.casefold()
        report.require(
            "postgresql://" not in normalized_schema and "postgres://" not in normalized_schema,
            "Prisma schema must not embed a PostgreSQL connection string",
        )

    if migration_text is not None:
        require_fragments(
            migration_text,
            REQUIRED_DATABASE_CONTROLS,
            report,
            "Initial migration lacks required database control",
        )
        for table in RLS_TABLES:
            report.require(
                f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;' in migration_text,
                f"Initial migration does not enable RLS for: {table}",
            )
        report.require(
            "create policy" not in migration_text.casefold(),
            "Initial migration must not add policies before authorization is implemented",
        )

    return report
