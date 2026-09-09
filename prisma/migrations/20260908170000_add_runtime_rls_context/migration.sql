-- Runtime database boundary for authenticated business operations.
--
-- The application currently uses the administrative Prisma connection while
-- this boundary is introduced. The role created here is deliberately NOLOGIN
-- until the runtime connection and authentication split are configured in a
-- later, separately reviewed change.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ggp_runtime') THEN
    CREATE ROLE ggp_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  ELSE
    ALTER ROLE ggp_runtime
      NOLOGIN
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE ggp_runtime SET search_path = public;

CREATE SCHEMA IF NOT EXISTS ggp;
REVOKE ALL ON SCHEMA ggp FROM PUBLIC;
GRANT USAGE ON SCHEMA ggp TO ggp_runtime;

CREATE OR REPLACE FUNCTION ggp.current_account_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(current_setting('ggp.account_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION ggp.current_person_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT NULLIF(current_setting('ggp.person_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION ggp.has_role(role_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
  SELECT role_name = ANY (
    string_to_array(COALESCE(current_setting('ggp.roles', true), ''), ',')
  )
$$;

CREATE OR REPLACE FUNCTION ggp.has_functional_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, ggp
AS $$
  SELECT ggp.has_role('HR_ADMIN')
      OR ggp.has_role('MANAGER')
      OR ggp.has_role('EMPLOYEE')
$$;

GRANT EXECUTE ON FUNCTION ggp.current_account_id() TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.current_person_id() TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.has_role(text) TO ggp_runtime;
GRANT EXECUTE ON FUNCTION ggp.has_functional_role() TO ggp_runtime;

-- Runtime receives only business-table privileges. Authentication and
-- technical account management remain fail-closed until they use a separate
-- least-privilege connection.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ggp_runtime;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM ggp_runtime;

GRANT USAGE ON SCHEMA public TO ggp_runtime;
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
  public.cycle_form_templates,
  public.feedbacks,
  public.feedback_answers
TO ggp_runtime;

GRANT INSERT ON TABLE public.audit_events TO ggp_runtime;

-- Keep the fail-closed posture explicit for every business table.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_line_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Organization visibility follows the authenticated person's company.
CREATE POLICY companies_runtime_read ON public.companies
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.people AS person
      WHERE person.company_id = companies.id
        AND person.id = ggp.current_person_id()
        AND person.active
    )
  );

CREATE POLICY companies_runtime_insert ON public.companies
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY companies_runtime_update ON public.companies
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY departments_runtime_read ON public.departments
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.people AS person
      WHERE person.company_id = departments.company_id
        AND person.id = ggp.current_person_id()
        AND person.active
    )
  );

CREATE POLICY departments_runtime_insert ON public.departments
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY departments_runtime_update ON public.departments
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY people_runtime_read ON public.people
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR people.id = ggp.current_person_id()
    OR (ggp.has_role('MANAGER') AND people.manager_id = ggp.current_person_id())
  );

CREATE POLICY people_runtime_insert ON public.people
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY people_runtime_update ON public.people
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY reporting_history_runtime_read ON public.reporting_line_history
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR reporting_line_history.subordinate_id = ggp.current_person_id()
    OR (ggp.has_role('MANAGER') AND reporting_line_history.manager_id = ggp.current_person_id())
  );

CREATE POLICY reporting_history_runtime_insert ON public.reporting_line_history
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY reporting_history_runtime_update ON public.reporting_line_history
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

-- Functional users may read only open cycles and active form definitions.
CREATE POLICY cycles_runtime_read ON public.cycles
  FOR SELECT TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN') OR (ggp.has_functional_role() AND status = 'OPEN'));

CREATE POLICY cycles_runtime_insert ON public.cycles
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY cycles_runtime_update ON public.cycles
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

CREATE POLICY templates_runtime_read ON public.form_templates
  FOR SELECT TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN') OR (ggp.has_functional_role() AND active));

CREATE POLICY questions_runtime_read ON public.form_questions
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR (
      ggp.has_functional_role()
      AND active
      AND EXISTS (
        SELECT 1
        FROM public.form_templates AS template
        WHERE template.id = form_questions.template_id
          AND template.active
      )
    )
  );

CREATE POLICY cycle_templates_runtime_read ON public.cycle_form_templates
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR (
      ggp.has_functional_role()
      AND EXISTS (
        SELECT 1
        FROM public.cycles AS cycle
        JOIN public.form_templates AS template ON template.id = cycle_form_templates.template_id
        WHERE cycle.id = cycle_form_templates.cycle_id
          AND cycle.status = 'OPEN'
          AND template.active
      )
    )
  );

CREATE POLICY cycle_templates_runtime_insert ON public.cycle_form_templates
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

-- A manager sees feedbacks authored for their direct reports and feedbacks
-- about themselves. An employee sees only feedbacks about themselves.
CREATE POLICY feedbacks_runtime_read ON public.feedbacks
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR feedbacks.subject_person_id = ggp.current_person_id()
    OR (ggp.has_role('MANAGER') AND feedbacks.evaluator_person_id = ggp.current_person_id())
  );

CREATE POLICY feedbacks_runtime_insert ON public.feedbacks
  FOR INSERT TO ggp_runtime
  WITH CHECK (
    (
      ggp.has_role('MANAGER')
      AND evaluator_person_id = ggp.current_person_id()
      AND subject_person_id <> ggp.current_person_id()
      AND EXISTS (
        SELECT 1
        FROM public.people AS subject
        WHERE subject.id = feedbacks.subject_person_id
          AND subject.manager_id = ggp.current_person_id()
          AND subject.active
      )
    )
    OR (
      ggp.has_role('EMPLOYEE')
      AND evaluator_person_id = ggp.current_person_id()
      AND subject_person_id = ggp.current_person_id()
    )
  );

CREATE POLICY feedbacks_runtime_update ON public.feedbacks
  FOR UPDATE TO ggp_runtime
  USING (
    status = 'DRAFT'
    AND evaluator_person_id = ggp.current_person_id()
    AND (
      (
        ggp.has_role('MANAGER')
        AND subject_person_id <> ggp.current_person_id()
        AND EXISTS (
          SELECT 1
          FROM public.people AS subject
          WHERE subject.id = feedbacks.subject_person_id
            AND subject.manager_id = ggp.current_person_id()
            AND subject.active
        )
      )
      OR (ggp.has_role('EMPLOYEE') AND subject_person_id = ggp.current_person_id())
    )
  )
  WITH CHECK (status IN ('DRAFT', 'SUBMITTED'));

CREATE POLICY feedback_answers_runtime_read ON public.feedback_answers
  FOR SELECT TO ggp_runtime
  USING (
    EXISTS (
      SELECT 1
      FROM public.feedbacks AS feedback
      WHERE feedback.id = feedback_answers.feedback_id
        AND (
          ggp.has_role('HR_ADMIN')
          OR feedback.subject_person_id = ggp.current_person_id()
          OR (ggp.has_role('MANAGER') AND feedback.evaluator_person_id = ggp.current_person_id())
        )
    )
  );

CREATE POLICY feedback_answers_runtime_insert ON public.feedback_answers
  FOR INSERT TO ggp_runtime
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.feedbacks AS feedback
      WHERE feedback.id = feedback_answers.feedback_id
        AND feedback.status = 'DRAFT'
        AND feedback.evaluator_person_id = ggp.current_person_id()
    )
  );

CREATE POLICY feedback_answers_runtime_update ON public.feedback_answers
  FOR UPDATE TO ggp_runtime
  USING (
    EXISTS (
      SELECT 1
      FROM public.feedbacks AS feedback
      WHERE feedback.id = feedback_answers.feedback_id
        AND feedback.status = 'DRAFT'
        AND feedback.evaluator_person_id = ggp.current_person_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.feedbacks AS feedback
      WHERE feedback.id = feedback_answers.feedback_id
        AND feedback.status = 'DRAFT'
        AND feedback.evaluator_person_id = ggp.current_person_id()
    )
  );

CREATE POLICY audit_events_runtime_insert ON public.audit_events
  FOR INSERT TO ggp_runtime
  WITH CHECK (
    actor_account_id = ggp.current_account_id()
    AND (
      ggp.has_role('SYSTEM_ADMIN')
      OR ggp.has_functional_role()
    )
  );

COMMIT;
