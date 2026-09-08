-- Stable source identifier used for idempotent personnel imports.
ALTER TABLE "people"
  ADD COLUMN "source_key" VARCHAR(190);

CREATE UNIQUE INDEX "people_source_key_key"
  ON "people"("source_key")
  WHERE "source_key" IS NOT NULL;
