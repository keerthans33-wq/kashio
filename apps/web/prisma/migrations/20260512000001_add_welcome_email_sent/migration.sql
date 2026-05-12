-- Track whether the welcome email has been sent to avoid re-sending on every login.
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "welcomeEmailSent" BOOLEAN NOT NULL DEFAULT false;
