from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "examples"))

from tool_policy_enforcer import Approval, RequestContext, authorize_tool_call, canonical_args_hash


class ToolPolicyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.ctx = RequestContext("r1", "u1", "authorized_sender", "t1", "repo1", "development")

    def test_requires_approval(self) -> None:
        with self.assertRaises(PermissionError):
            authorize_tool_call(
                tool_name="send_external_message",
                arguments={"recipient": "a@example.com", "subject": "x", "body": "y", "idempotency_key": "k"},
                context=self.ctx, calls_so_far=0, approval=None, current_epoch=100,
            )

    def test_binds_exact_arguments(self) -> None:
        args = {"recipient": "a@example.com", "subject": "x", "body": "y", "idempotency_key": "k"}
        normalized = dict(args, tenant_id="t1", repository_id="repo1", environment="development")
        approval = Approval("a1", "u1", "t1", "repo1", "development", "send_external_message", canonical_args_hash(normalized), 200, True)
        result = authorize_tool_call(
            tool_name="send_external_message", arguments=args, context=self.ctx,
            calls_so_far=0, approval=approval, current_epoch=100,
        )
        self.assertEqual(result["tenant_id"], "t1")

    def test_rejects_cross_tenant(self) -> None:
        with self.assertRaises(PermissionError):
            authorize_tool_call(
                tool_name="search_knowledge", arguments={"tenant_id": "other"}, context=self.ctx,
                calls_so_far=0, approval=None, current_epoch=100,
            )


if __name__ == "__main__":
    unittest.main()
