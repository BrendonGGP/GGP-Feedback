from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from ggp_guardrails.database import (
    INITIAL_MIGRATION,
    REQUIRED_DATABASE_CONTROLS,
    RLS_TABLES,
    validate_database_foundation,
)


class DatabaseGuardrailsTest(unittest.TestCase):
    def test_accepts_expected_fail_closed_foundation(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_valid_foundation(root)

            report = validate_database_foundation(root)

            self.assertTrue(report.succeeded, report.errors)

    def test_rejects_policy_before_authorization_exists(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_valid_foundation(root)
            migration = root / INITIAL_MIGRATION
            migration.write_text(
                migration.read_text(encoding="utf-8") + "\nCREATE POLICY unexpected;\n",
                encoding="utf-8",
            )

            report = validate_database_foundation(root)

            self.assertFalse(report.succeeded)
            self.assertIn(
                "Initial migration must not add policies before authorization is implemented",
                report.errors,
            )

    def test_rejects_embedded_database_connection_string(self) -> None:
        with TemporaryDirectory() as directory:
            root = Path(directory)
            self._write_valid_foundation(root)
            schema = root / "prisma/schema.prisma"
            schema.write_text(
                schema.read_text(encoding="utf-8")
                + '\n// postgresql://user:password@database.invalid/project\n',
                encoding="utf-8",
            )

            report = validate_database_foundation(root)

            self.assertFalse(report.succeeded)
            self.assertIn(
                "Prisma schema must not embed a PostgreSQL connection string",
                report.errors,
            )

    @staticmethod
    def _write_valid_foundation(root: Path) -> None:
        schema = root / "prisma/schema.prisma"
        schema.parent.mkdir(parents=True)
        schema.write_text(
            'datasource db {\n'
            '  provider  = "postgresql"\n'
            '  url       = env("DATABASE_URL")\n'
            '  directUrl = env("DIRECT_URL")\n'
            '}\n',
            encoding="utf-8",
        )

        migration = root / INITIAL_MIGRATION
        migration.parent.mkdir(parents=True)
        fragments = list(REQUIRED_DATABASE_CONTROLS)
        fragments.extend(
            f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY;' for table in RLS_TABLES
        )
        migration.write_text("\n".join(fragments), encoding="utf-8")


if __name__ == "__main__":
    unittest.main()
