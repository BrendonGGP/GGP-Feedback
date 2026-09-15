-- Permite direcionar cada formulário para gestores, colaboradores ou ambos.
-- O valor padrão preserva o comportamento dos formulários já existentes.

BEGIN;

CREATE TYPE "FormAudience" AS ENUM ('MANAGER', 'EMPLOYEE', 'BOTH');

ALTER TABLE "form_templates"
  ADD COLUMN "audience" "FormAudience" NOT NULL DEFAULT 'BOTH';

-- O RH é autorizado no servidor e recebe apenas o menor conjunto de escrita
-- necessário para versionar formulários e suas perguntas.
GRANT INSERT, UPDATE ON TABLE public.form_templates, public.form_questions TO ggp_runtime;

DROP POLICY IF EXISTS templates_runtime_insert ON public.form_templates;
CREATE POLICY templates_runtime_insert ON public.form_templates
  FOR INSERT TO ggp_runtime
  WITH CHECK (ggp.has_role('HR_ADMIN'));

DROP POLICY IF EXISTS templates_runtime_update ON public.form_templates;
CREATE POLICY templates_runtime_update ON public.form_templates
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

DROP POLICY IF EXISTS questions_runtime_insert ON public.form_questions;
CREATE POLICY questions_runtime_insert ON public.form_questions
  FOR INSERT TO ggp_runtime
  WITH CHECK (
    ggp.has_role('HR_ADMIN')
    AND EXISTS (
      SELECT 1
      FROM public.form_templates AS template
      WHERE template.id = form_questions.template_id
    )
  );

DROP POLICY IF EXISTS questions_runtime_update ON public.form_questions;
CREATE POLICY questions_runtime_update ON public.form_questions
  FOR UPDATE TO ggp_runtime
  USING (ggp.has_role('HR_ADMIN'))
  WITH CHECK (ggp.has_role('HR_ADMIN'));

COMMIT;
