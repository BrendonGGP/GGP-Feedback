-- Align the local development database when its Prisma URL uses schema=ggp.
--
-- The canonical deployed layout keeps business tables in public and security
-- helpers in ggp. A local database was initialized with schema=ggp before
-- that convention was fixed, so this migration installs the equivalent
-- fail-closed policies on ggp tables without touching their data. On a
-- canonical public-only database the block is a no-op.

BEGIN;

DO $$
BEGIN
  IF to_regclass('ggp.companies') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ggp_runtime') THEN
    EXECUTE $role$
      CREATE ROLE ggp_runtime
        NOLOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOINHERIT
        NOBYPASSRLS
    $role$;
  ELSE
    EXECUTE $role$
      ALTER ROLE ggp_runtime
        NOLOGIN
        NOSUPERUSER
        NOCREATEDB
        NOCREATEROLE
        NOINHERIT
        NOBYPASSRLS
    $role$;
  END IF;

  EXECUTE 'ALTER ROLE ggp_runtime SET search_path = ggp';
  EXECUTE 'REVOKE ALL ON SCHEMA ggp FROM PUBLIC';
  EXECUTE 'GRANT USAGE ON SCHEMA ggp TO ggp_runtime';
  EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA ggp FROM ggp_runtime';
  EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA ggp FROM ggp_runtime';

  EXECUTE $grant$
    GRANT SELECT ON TABLE
      ggp.companies,
      ggp.departments,
      ggp.people,
      ggp.reporting_line_history,
      ggp.cycles,
      ggp.form_templates,
      ggp.form_questions,
      ggp.cycle_form_templates,
      ggp.feedbacks,
      ggp.feedback_answers
    TO ggp_runtime
  $grant$;

  EXECUTE $grant$
    GRANT INSERT, UPDATE ON TABLE
      ggp.companies,
      ggp.departments,
      ggp.people,
      ggp.reporting_line_history,
      ggp.cycles,
      ggp.cycle_form_templates,
      ggp.feedbacks,
      ggp.feedback_answers
    TO ggp_runtime
  $grant$;

  EXECUTE 'GRANT INSERT ON TABLE ggp.audit_events TO ggp_runtime';

  EXECUTE 'ALTER TABLE ggp.companies ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.departments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.people ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.reporting_line_history ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.cycles ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.form_templates ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.form_questions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.cycle_form_templates ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.feedbacks ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.feedback_answers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE ggp.audit_events ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS companies_runtime_read ON ggp.companies';
  EXECUTE 'DROP POLICY IF EXISTS companies_runtime_insert ON ggp.companies';
  EXECUTE 'DROP POLICY IF EXISTS companies_runtime_update ON ggp.companies';
  EXECUTE 'DROP POLICY IF EXISTS departments_runtime_read ON ggp.departments';
  EXECUTE 'DROP POLICY IF EXISTS departments_runtime_insert ON ggp.departments';
  EXECUTE 'DROP POLICY IF EXISTS departments_runtime_update ON ggp.departments';
  EXECUTE 'DROP POLICY IF EXISTS people_runtime_read ON ggp.people';
  EXECUTE 'DROP POLICY IF EXISTS people_runtime_insert ON ggp.people';
  EXECUTE 'DROP POLICY IF EXISTS people_runtime_update ON ggp.people';
  EXECUTE 'DROP POLICY IF EXISTS reporting_history_runtime_read ON ggp.reporting_line_history';
  EXECUTE 'DROP POLICY IF EXISTS reporting_history_runtime_insert ON ggp.reporting_line_history';
  EXECUTE 'DROP POLICY IF EXISTS reporting_history_runtime_update ON ggp.reporting_line_history';
  EXECUTE 'DROP POLICY IF EXISTS cycles_runtime_read ON ggp.cycles';
  EXECUTE 'DROP POLICY IF EXISTS cycles_runtime_insert ON ggp.cycles';
  EXECUTE 'DROP POLICY IF EXISTS cycles_runtime_update ON ggp.cycles';
  EXECUTE 'DROP POLICY IF EXISTS templates_runtime_read ON ggp.form_templates';
  EXECUTE 'DROP POLICY IF EXISTS questions_runtime_read ON ggp.form_questions';
  EXECUTE 'DROP POLICY IF EXISTS cycle_templates_runtime_read ON ggp.cycle_form_templates';
  EXECUTE 'DROP POLICY IF EXISTS cycle_templates_runtime_insert ON ggp.cycle_form_templates';
  EXECUTE 'DROP POLICY IF EXISTS feedbacks_runtime_read ON ggp.feedbacks';
  EXECUTE 'DROP POLICY IF EXISTS feedbacks_runtime_insert ON ggp.feedbacks';
  EXECUTE 'DROP POLICY IF EXISTS feedbacks_runtime_update ON ggp.feedbacks';
  EXECUTE 'DROP POLICY IF EXISTS feedback_answers_runtime_read ON ggp.feedback_answers';
  EXECUTE 'DROP POLICY IF EXISTS feedback_answers_runtime_insert ON ggp.feedback_answers';
  EXECUTE 'DROP POLICY IF EXISTS feedback_answers_runtime_update ON ggp.feedback_answers';
  EXECUTE 'DROP POLICY IF EXISTS audit_events_runtime_insert ON ggp.audit_events';

  EXECUTE $policy$
    CREATE POLICY companies_runtime_read ON ggp.companies
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR EXISTS (
          SELECT 1 FROM ggp.people AS person
          WHERE person.company_id = companies.id
            AND person.id = ggp.current_person_id()
            AND person.active
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY companies_runtime_insert ON ggp.companies
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY companies_runtime_update ON ggp.companies
      FOR UPDATE TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN'))
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY departments_runtime_read ON ggp.departments
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR EXISTS (
          SELECT 1 FROM ggp.people AS person
          WHERE person.company_id = departments.company_id
            AND person.id = ggp.current_person_id()
            AND person.active
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY departments_runtime_insert ON ggp.departments
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY departments_runtime_update ON ggp.departments
      FOR UPDATE TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN'))
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY people_runtime_read ON ggp.people
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR people.id = ggp.current_person_id()
        OR (ggp.has_role('MANAGER') AND people.manager_id = ggp.current_person_id())
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY people_runtime_insert ON ggp.people
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY people_runtime_update ON ggp.people
      FOR UPDATE TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN'))
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY reporting_history_runtime_read ON ggp.reporting_line_history
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR reporting_line_history.subordinate_id = ggp.current_person_id()
        OR (ggp.has_role('MANAGER') AND reporting_line_history.manager_id = ggp.current_person_id())
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY reporting_history_runtime_insert ON ggp.reporting_line_history
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY reporting_history_runtime_update ON ggp.reporting_line_history
      FOR UPDATE TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN'))
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY cycles_runtime_read ON ggp.cycles
      FOR SELECT TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN') OR (ggp.has_functional_role() AND status = 'OPEN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY cycles_runtime_insert ON ggp.cycles
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY cycles_runtime_update ON ggp.cycles
      FOR UPDATE TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN'))
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY templates_runtime_read ON ggp.form_templates
      FOR SELECT TO ggp_runtime
      USING (ggp.has_role('HR_ADMIN') OR (ggp.has_functional_role() AND active))
  $policy$;
  EXECUTE $policy$
    CREATE POLICY questions_runtime_read ON ggp.form_questions
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR (
          ggp.has_functional_role()
          AND active
          AND EXISTS (
            SELECT 1 FROM ggp.form_templates AS template
            WHERE template.id = form_questions.template_id
              AND template.active
          )
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY cycle_templates_runtime_read ON ggp.cycle_form_templates
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR (
          ggp.has_functional_role()
          AND EXISTS (
            SELECT 1
            FROM ggp.cycles AS cycle
            JOIN ggp.form_templates AS template ON template.id = cycle_form_templates.template_id
            WHERE cycle.id = cycle_form_templates.cycle_id
              AND cycle.status = 'OPEN'
              AND template.active
          )
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY cycle_templates_runtime_insert ON ggp.cycle_form_templates
      FOR INSERT TO ggp_runtime
      WITH CHECK (ggp.has_role('HR_ADMIN'))
  $policy$;

  EXECUTE $policy$
    CREATE POLICY feedbacks_runtime_read ON ggp.feedbacks
      FOR SELECT TO ggp_runtime
      USING (
        ggp.has_role('HR_ADMIN')
        OR feedbacks.subject_person_id = ggp.current_person_id()
        OR (ggp.has_role('MANAGER') AND feedbacks.evaluator_person_id = ggp.current_person_id())
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY feedbacks_runtime_insert ON ggp.feedbacks
      FOR INSERT TO ggp_runtime
      WITH CHECK (
        (
          ggp.has_role('MANAGER')
          AND evaluator_person_id = ggp.current_person_id()
          AND subject_person_id <> ggp.current_person_id()
          AND EXISTS (
            SELECT 1 FROM ggp.people AS subject
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
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY feedbacks_runtime_update ON ggp.feedbacks
      FOR UPDATE TO ggp_runtime
      USING (
        status = 'DRAFT'
        AND evaluator_person_id = ggp.current_person_id()
        AND (
          (
            ggp.has_role('MANAGER')
            AND subject_person_id <> ggp.current_person_id()
            AND EXISTS (
              SELECT 1 FROM ggp.people AS subject
              WHERE subject.id = feedbacks.subject_person_id
                AND subject.manager_id = ggp.current_person_id()
                AND subject.active
            )
          )
          OR (ggp.has_role('EMPLOYEE') AND subject_person_id = ggp.current_person_id())
        )
      )
      WITH CHECK (
        status IN ('DRAFT', 'SUBMITTED')
        AND evaluator_person_id = ggp.current_person_id()
        AND (
          (
            ggp.has_role('MANAGER')
            AND subject_person_id <> ggp.current_person_id()
            AND EXISTS (
              SELECT 1 FROM ggp.people AS subject
              WHERE subject.id = feedbacks.subject_person_id
                AND subject.manager_id = ggp.current_person_id()
                AND subject.active
            )
          )
          OR (ggp.has_role('EMPLOYEE') AND subject_person_id = ggp.current_person_id())
        )
      )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY feedback_answers_runtime_read ON ggp.feedback_answers
      FOR SELECT TO ggp_runtime
      USING (
        EXISTS (
          SELECT 1 FROM ggp.feedbacks AS feedback
          WHERE feedback.id = feedback_answers.feedback_id
            AND (
              ggp.has_role('HR_ADMIN')
              OR feedback.subject_person_id = ggp.current_person_id()
              OR (ggp.has_role('MANAGER') AND feedback.evaluator_person_id = ggp.current_person_id())
            )
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY feedback_answers_runtime_insert ON ggp.feedback_answers
      FOR INSERT TO ggp_runtime
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM ggp.feedbacks AS feedback
          WHERE feedback.id = feedback_answers.feedback_id
            AND feedback.status = 'DRAFT'
            AND feedback.evaluator_person_id = ggp.current_person_id()
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY feedback_answers_runtime_update ON ggp.feedback_answers
      FOR UPDATE TO ggp_runtime
      USING (
        EXISTS (
          SELECT 1 FROM ggp.feedbacks AS feedback
          WHERE feedback.id = feedback_answers.feedback_id
            AND feedback.status = 'DRAFT'
            AND feedback.evaluator_person_id = ggp.current_person_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM ggp.feedbacks AS feedback
          WHERE feedback.id = feedback_answers.feedback_id
            AND feedback.status = 'DRAFT'
            AND feedback.evaluator_person_id = ggp.current_person_id()
        )
      )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY audit_events_runtime_insert ON ggp.audit_events
      FOR INSERT TO ggp_runtime
      WITH CHECK (
        actor_account_id = ggp.current_account_id()
        AND (ggp.has_role('SYSTEM_ADMIN') OR ggp.has_functional_role())
      )
  $policy$;
END
$$;

COMMIT;
