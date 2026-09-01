from __future__ import annotations

import sys
from pathlib import Path, PurePosixPath
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from path_policy import is_allowed_protected_template, is_protected_path


class PathPolicyTests(unittest.TestCase):
    def test_recognizes_protected_paths(self) -> None:
        protected = (
            ".env",
            "examples/.env.example",
            "certs/service.pem",
            "credentials-prod.json",
            ".ssh/id_ed25519",
            ".kube/config",
            ".config/gcloud/config",
            ".config/gcloud/profiles/default",
        )

        for relative in protected:
            with self.subTest(relative=relative):
                self.assertTrue(is_protected_path(PurePosixPath(relative)))

    def test_does_not_classify_regular_sources_as_protected(self) -> None:
        self.assertFalse(is_protected_path(PurePosixPath("scripts/validate_package.py")))

    def test_allows_only_the_known_template_without_scanning(self) -> None:
        self.assertTrue(is_allowed_protected_template(PurePosixPath("examples/.env.example")))
        self.assertFalse(is_allowed_protected_template(PurePosixPath("examples/.env.local")))


if __name__ == "__main__":
    unittest.main()
