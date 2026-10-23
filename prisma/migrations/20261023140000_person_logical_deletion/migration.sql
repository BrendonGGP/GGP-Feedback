-- Exclusão lógica de pessoas pelo RH (pedido de out/2026).
--
-- A pessoa excluída some das telas e listas do portal, mas o registro e o
-- histórico de feedbacks ficam preservados para auditoria. Quem excluiu e
-- quando ficam gravados aqui e no audit_events; o administrador do sistema
-- pode restaurar. Mudança aditiva: nenhum dado existente é alterado.

BEGIN;

ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz(3),
  ADD COLUMN IF NOT EXISTS deleted_by_account_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'people_deleted_by_account_id_fkey'
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_deleted_by_account_id_fkey
      FOREIGN KEY (deleted_by_account_id) REFERENCES public.access_accounts(id)
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Uma pessoa excluída nunca fica ativa.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'people_deleted_is_inactive_check'
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_deleted_is_inactive_check
      CHECK (deleted_at IS NULL OR active = false);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "people_deleted_at_idx" ON public.people ("deleted_at");

COMMIT;
