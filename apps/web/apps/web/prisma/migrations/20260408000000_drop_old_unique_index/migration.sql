-- Drop the old unique index that doesn't include userId.
-- The previous migration (20260406000000_add_user_id) tried to drop it as a
-- CONSTRAINT but it was created as an INDEX, so the DROP was silently ignored.
-- This causes createMany() to fail with a unique constraint violation when two
-- different users import the same transactions.

DROP INDEX IF EXISTS "Transaction_date_description_amount_key";
