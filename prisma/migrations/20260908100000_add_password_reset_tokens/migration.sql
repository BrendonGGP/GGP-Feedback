-- Store only a digest of the one-time password reset token.
ALTER TABLE "access_accounts"
  ADD COLUMN "password_reset_token_hash" VARCHAR(128),
  ADD COLUMN "password_reset_expires_at" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "access_accounts_password_reset_token_hash_key"
  ON "access_accounts"("password_reset_token_hash");

CREATE INDEX "access_accounts_password_reset_expires_at_idx"
  ON "access_accounts"("password_reset_expires_at");
