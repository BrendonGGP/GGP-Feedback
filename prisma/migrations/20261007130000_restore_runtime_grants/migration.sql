-- Restores the privileges of `ggp_runtime` on the current `public` layout.
--
-- Databases that went through the `ggp` -> `public` layout change (see
-- 20260909120000_align_local_ggp_rls) kept the policies but lost the table
-- grants and the USAGE on schema `ggp`, where the RLS helper functions live.
-- Since the application now runs every business transaction as
-- `ggp_runtime`, missing grants make every functional screen fail with
-- "permission denied".
--
-- Every statement below is idempotent and only re-asserts the privileges
-- defined by 20260908170000_add_runtime_rls_context and later migrations, so
-- it is safe on databases that already have them.

BEGIN;

GRANT USAGE ON SCHEMA public TO ggp_runtime;
GRANT USAGE ON SCHEMA ggp TO ggp_runtime;

GRANT EXECUTE ON FUNCTION ggp.current_account_id() TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.current_person_id() TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.has_role(text) TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.has_functional_role() TO ggp_runtime;

GRANT SELECT ON TABLE
  public.companies,
  public.departments,
  public.people,
  public.reporting_line_history,
  public.cycles,
  public.form_templates,
  public.form_questions,
  public.cycle_form_templates,
  public.feedbacks,
  public.feedback_answers
TO ggp_runtime;

GRANT INSERT, UPDATE ON TABLE
  public.companies,
  public.departments,
  public.people,
  public.reporting_line_history,
  public.cycles,
  public.form_templates,
  public.form_questions,
  public.feedbacks,
  public.feedback_answers
TO ggp_runtime;

-- Cycle/template links are created but never updated (see
-- 20260908173000_tighten_runtime_rls_policies).
GRANT INSERT ON TABLE public.cycle_form_templates TO ggp_runtime;

-- Audit stays write-only for the application.
GRANT INSERT ON TABLE public.audit_events TO ggp_runtime;

-- HR reads only whether a person has an account and its status.
GRANT SELECT (id, person_id, status) ON TABLE public.access_accounts TO ggp_runtime;

COMMIT;
