-- Prepares the RLS policies for the application to run as `ggp_runtime`.
--
-- From this release on, `withDatabaseActor` executes `SET LOCAL ROLE
-- ggp_runtime` in every business transaction, so these policies stop being
-- documentation and start filtering rows. The rules below keep every existing
-- screen working under that role:
--
-- 1. The person being evaluated only sees a feedback after it is submitted;
--    the author always sees what they wrote (same rule as the application).
-- 2. Rows linked to a visible feedback become readable: its cycle (even when
--    closed), its answered questions (even when archived) and the people,
--    companies and departments shown next to it.
-- 3. HR may read the existence and status of access accounts (three columns
--    only) to show which people already have an account.
--
-- SELECT-policy dependencies (no cycles, so no infinite recursion):
--   companies, departments -> people -> feedbacks
--   cycles, feedback_answers -> feedbacks
--   form_questions -> form_templates, feedback_answers

BEGIN;

-- Feedbacks -------------------------------------------------------------

DROP POLICY IF EXISTS feedbacks_runtime_read ON public.feedbacks;
CREATE POLICY feedbacks_runtime_read ON public.feedbacks
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR (
      ggp.has_functional_role()
      AND (
        feedbacks.evaluator_person_id = ggp.current_person_id()
        OR (
          feedbacks.subject_person_id = ggp.current_person_id()
          AND feedbacks.status = 'SUBMITTED'
        )
      )
    )
  );

-- Answers follow the visibility of their feedback (the subquery is itself
-- filtered by feedbacks_runtime_read).
DROP POLICY IF EXISTS feedback_answers_runtime_read ON public.feedback_answers;
CREATE POLICY feedback_answers_runtime_read ON public.feedback_answers
  FOR SELECT TO ggp_runtime
  USING (
    EXISTS (
      SELECT 1
      FROM public.feedbacks AS feedback
      WHERE feedback.id = feedback_answers.feedback_id
    )
  );

-- Cycles and questions --------------------------------------------------

DROP POLICY IF EXISTS cycles_runtime_read ON public.cycles;
CREATE POLICY cycles_runtime_read ON public.cycles
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR (
      ggp.has_functional_role()
      AND (
        cycles.status = 'OPEN'
        OR EXISTS (
          SELECT 1
          FROM public.feedbacks AS feedback
          WHERE feedback.cycle_id = cycles.id
        )
      )
    )
  );

DROP POLICY IF EXISTS questions_runtime_read ON public.form_questions;
CREATE POLICY questions_runtime_read ON public.form_questions
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR (
      ggp.has_functional_role()
      AND (
        (
          form_questions.active
          AND EXISTS (
            SELECT 1
            FROM public.form_templates AS template
            WHERE template.id = form_questions.template_id
              AND template.active
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.feedback_answers AS answer
          WHERE answer.question_id = form_questions.id
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS "feedback_answers_question_id_idx"
  ON public.feedback_answers ("question_id");

-- People and organization -----------------------------------------------

DROP POLICY IF EXISTS people_runtime_read ON public.people;
CREATE POLICY people_runtime_read ON public.people
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR people.id = ggp.current_person_id()
    OR (ggp.has_role('MANAGER') AND people.manager_id = ggp.current_person_id())
    OR (
      ggp.has_functional_role()
      AND EXISTS (
        SELECT 1
        FROM public.feedbacks AS feedback
        WHERE feedback.subject_person_id = people.id
           OR feedback.evaluator_person_id = people.id
      )
    )
  );

-- Companies and departments follow the people the actor can already see
-- (the subquery is filtered by people_runtime_read). No functional-role guard
-- here: every signed-in person, SYSTEM_ADMIN included, must read their own
-- company and department to render the portal shell.
DROP POLICY IF EXISTS companies_runtime_read ON public.companies;
CREATE POLICY companies_runtime_read ON public.companies
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.people AS person
      WHERE person.company_id = companies.id
    )
  );

DROP POLICY IF EXISTS departments_runtime_read ON public.departments;
CREATE POLICY departments_runtime_read ON public.departments
  FOR SELECT TO ggp_runtime
  USING (
    ggp.has_role('HR_ADMIN')
    OR EXISTS (
      SELECT 1
      FROM public.people AS person
      WHERE person.department_id = departments.id
    )
  );

-- Access accounts: existence and status only, for HR ---------------------

GRANT SELECT (id, person_id, status) ON TABLE public.access_accounts TO ggp_runtime;

DROP POLICY IF EXISTS access_accounts_runtime_read ON public.access_accounts;
CREATE POLICY access_accounts_runtime_read ON public.access_accounts
  FOR SELECT TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'));

COMMIT;
