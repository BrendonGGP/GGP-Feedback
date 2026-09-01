-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AccessRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'LOCKED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('RATING', 'LONG_TEXT', 'SHORT_TEXT');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "manager_id" UUID,
    "full_name" VARCHAR(200) NOT NULL,
    "corporate_email" VARCHAR(254),
    "job_title" VARCHAR(160) NOT NULL,
    "employment_regime" VARCHAR(80) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_accounts" (
    "id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "login_identifier" VARCHAR(190) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "password_changed_at" TIMESTAMPTZ(3),
    "last_login_at" TIMESTAMPTZ(3),
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "access_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_role_assignments" (
    "account_id" UUID NOT NULL,
    "role" "AccessRole" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_role_assignments_pkey" PRIMARY KEY ("account_id", "role")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "token_hash" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_line_history" (
    "id" UUID NOT NULL,
    "subordinate_id" UUID NOT NULL,
    "manager_id" UUID,
    "changed_by_account_id" UUID,
    "valid_from" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMPTZ(3),
    "reason" VARCHAR(240),
    CONSTRAINT "reporting_line_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "ends_at" TIMESTAMPTZ(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'DRAFT',
    "self_assessment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_questions" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "prompt" VARCHAR(1000) NOT NULL,
    "type" "QuestionType" NOT NULL,
    "position" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "minimum" INTEGER,
    "maximum" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cycle_form_templates" (
    "cycle_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    CONSTRAINT "cycle_form_templates_pkey" PRIMARY KEY ("cycle_id", "template_id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "subject_person_id" UUID NOT NULL,
    "evaluator_person_id" UUID NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_answers" (
    "id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "rating" INTEGER,
    "text" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "feedback_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_account_id" UUID,
    "request_id" VARCHAR(80) NOT NULL,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" UUID,
    "result" VARCHAR(40) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE INDEX "departments_company_id_active_idx" ON "departments"("company_id", "active");
CREATE UNIQUE INDEX "departments_company_id_name_key" ON "departments"("company_id", "name");
CREATE INDEX "people_company_id_active_idx" ON "people"("company_id", "active");
CREATE INDEX "people_department_id_active_idx" ON "people"("department_id", "active");
CREATE INDEX "people_manager_id_active_idx" ON "people"("manager_id", "active");
CREATE INDEX "people_corporate_email_idx" ON "people"("corporate_email");
CREATE UNIQUE INDEX "people_corporate_email_ci_key" ON "people"(LOWER("corporate_email")) WHERE "corporate_email" IS NOT NULL;
CREATE UNIQUE INDEX "access_accounts_person_id_key" ON "access_accounts"("person_id");
CREATE INDEX "access_accounts_status_idx" ON "access_accounts"("status");
CREATE INDEX "access_accounts_login_identifier_idx" ON "access_accounts"("login_identifier");
CREATE UNIQUE INDEX "access_accounts_login_identifier_ci_key" ON "access_accounts"(LOWER("login_identifier"));
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "user_sessions"("token_hash");
CREATE INDEX "user_sessions_account_id_expires_at_idx" ON "user_sessions"("account_id", "expires_at");
CREATE INDEX "reporting_line_history_subordinate_id_valid_until_idx" ON "reporting_line_history"("subordinate_id", "valid_until");
CREATE UNIQUE INDEX "reporting_line_history_one_current_per_subordinate_key" ON "reporting_line_history"("subordinate_id") WHERE "valid_until" IS NULL;
CREATE INDEX "reporting_line_history_manager_id_valid_until_idx" ON "reporting_line_history"("manager_id", "valid_until");
CREATE INDEX "cycles_status_starts_at_ends_at_idx" ON "cycles"("status", "starts_at", "ends_at");
CREATE UNIQUE INDEX "form_templates_name_version_key" ON "form_templates"("name", "version");
CREATE UNIQUE INDEX "form_questions_template_id_position_key" ON "form_questions"("template_id", "position");
CREATE INDEX "feedbacks_subject_person_id_status_idx" ON "feedbacks"("subject_person_id", "status");
CREATE INDEX "feedbacks_evaluator_person_id_status_idx" ON "feedbacks"("evaluator_person_id", "status");
CREATE UNIQUE INDEX "feedbacks_cycle_id_subject_person_id_evaluator_person_id_key" ON "feedbacks"("cycle_id", "subject_person_id", "evaluator_person_id");
CREATE UNIQUE INDEX "feedback_answers_feedback_id_question_id_key" ON "feedback_answers"("feedback_id", "question_id");
CREATE INDEX "audit_events_actor_account_id_created_at_idx" ON "audit_events"("actor_account_id", "created_at");
CREATE INDEX "audit_events_entity_type_entity_id_created_at_idx" ON "audit_events"("entity_type", "entity_id", "created_at");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "people" ADD CONSTRAINT "people_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "people" ADD CONSTRAINT "people_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "people" ADD CONSTRAINT "people_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "access_accounts" ADD CONSTRAINT "access_accounts_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_role_assignments" ADD CONSTRAINT "account_role_assignments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "access_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "access_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reporting_line_history" ADD CONSTRAINT "reporting_line_history_subordinate_id_fkey" FOREIGN KEY ("subordinate_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reporting_line_history" ADD CONSTRAINT "reporting_line_history_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reporting_line_history" ADD CONSTRAINT "reporting_line_history_changed_by_account_id_fkey" FOREIGN KEY ("changed_by_account_id") REFERENCES "access_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_form_templates" ADD CONSTRAINT "cycle_form_templates_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cycle_form_templates" ADD CONSTRAINT "cycle_form_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_subject_person_id_fkey" FOREIGN KEY ("subject_person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_evaluator_person_id_fkey" FOREIGN KEY ("evaluator_person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedbacks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedback_answers" ADD CONSTRAINT "feedback_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "form_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_account_id_fkey" FOREIGN KEY ("actor_account_id") REFERENCES "access_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity constraints that cannot be represented entirely in the Prisma schema.
ALTER TABLE "people" ADD CONSTRAINT "people_manager_not_self_check" CHECK ("manager_id" IS NULL OR "manager_id" <> "id");
ALTER TABLE "cycles" ADD CONSTRAINT "cycles_dates_check" CHECK ("ends_at" > "starts_at");
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_rating_bounds_check" CHECK (
  ("type" = 'RATING' AND "minimum" IS NOT NULL AND "maximum" IS NOT NULL AND "minimum" <= "maximum")
  OR
  ("type" <> 'RATING' AND "minimum" IS NULL AND "maximum" IS NULL)
);

CREATE FUNCTION "validate_feedback_answer_rating"() RETURNS TRIGGER AS $$
DECLARE
  question_type "QuestionType";
  minimum_rating INTEGER;
  maximum_rating INTEGER;
BEGIN
  SELECT "type", "minimum", "maximum"
    INTO question_type, minimum_rating, maximum_rating
    FROM "form_questions"
   WHERE "id" = NEW."question_id";

  IF question_type = 'RATING' AND (NEW."rating" IS NULL OR NEW."rating" < minimum_rating OR NEW."rating" > maximum_rating) THEN
    RAISE EXCEPTION 'Rating must be between the configured question bounds';
  END IF;

  IF question_type <> 'RATING' AND NEW."rating" IS NOT NULL THEN
    RAISE EXCEPTION 'Only rating questions may store a rating';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "feedback_answers_validate_rating"
BEFORE INSERT OR UPDATE OF "question_id", "rating" ON "feedback_answers"
FOR EACH ROW EXECUTE FUNCTION "validate_feedback_answer_rating"();

-- Supabase Data API access is fail-closed until explicit role policies are added with authentication.
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "departments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "people" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "access_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_role_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reporting_line_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "form_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cycle_form_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedbacks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events" ENABLE ROW LEVEL SECURITY;
