-- Add the precaution payload required by the server to existing notifications.
-- The initial schema creates the notifications table; this migration must also
-- work when that table already exists without the column.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS precautions JSONB NOT NULL DEFAULT '[]'::jsonb;
