-- Separate technical system administration from business-wide HR access.
-- Existing ADMIN assignments retain their business meaning as HR_ADMIN.
BEGIN;

ALTER TYPE "AccessRole" RENAME VALUE 'ADMIN' TO 'HR_ADMIN';
ALTER TYPE "AccessRole" ADD VALUE 'SYSTEM_ADMIN' BEFORE 'HR_ADMIN';

CREATE FUNCTION "enforce_system_admin_role_exclusivity"() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(OLD."account_id"::text, 0)
    );
    RETURN OLD;
  END IF;

  -- Serialize assignments for the same account to prevent concurrent bypasses.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW."account_id"::text, 0)
  );

  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (
      SELECT 1
        FROM public."account_role_assignments" AS current_assignment
       WHERE current_assignment."account_id" = NEW."account_id"
         AND (current_assignment."account_id", current_assignment."role")
             IS DISTINCT FROM (OLD."account_id", OLD."role")
         AND (
           (NEW."role"::text = 'SYSTEM_ADMIN' AND current_assignment."role"::text <> 'SYSTEM_ADMIN')
           OR
           (NEW."role"::text <> 'SYSTEM_ADMIN' AND current_assignment."role"::text = 'SYSTEM_ADMIN')
         )
    ) THEN
      RAISE EXCEPTION 'SYSTEM_ADMIN must be the only role assigned to an account';
    END IF;
  ELSIF EXISTS (
    SELECT 1
      FROM public."account_role_assignments" AS current_assignment
     WHERE current_assignment."account_id" = NEW."account_id"
       AND (
         (NEW."role"::text = 'SYSTEM_ADMIN' AND current_assignment."role"::text <> 'SYSTEM_ADMIN')
         OR
         (NEW."role"::text <> 'SYSTEM_ADMIN' AND current_assignment."role"::text = 'SYSTEM_ADMIN')
       )
  ) THEN
    RAISE EXCEPTION 'SYSTEM_ADMIN must be the only role assigned to an account';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

CREATE TRIGGER "account_roles_enforce_system_admin_exclusivity"
BEFORE INSERT OR UPDATE OR DELETE ON "account_role_assignments"
FOR EACH ROW EXECUTE FUNCTION "enforce_system_admin_role_exclusivity"();

COMMIT;
