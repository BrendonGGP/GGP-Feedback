-- Tighten the runtime boundary after reviewing the first policy set.

BEGIN;

REVOKE UPDATE ON TABLE public.cycle_form_templates FROM ggp_runtime;

DROP POLICY feedbacks_runtime_update ON public.feedbacks;

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
  WITH CHECK (
    status IN ('DRAFT', 'SUBMITTED')
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
  );

COMMIT;
