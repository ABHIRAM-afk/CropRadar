-- ============================================================================
-- CROP RADAR: USER-SPECIFIC RADAR HIDDEN OUTBREAKS MIGRATION
-- Prepared for review - DO NOT EXECUTE DIRECTLY AGAINST SUPABASE
-- ============================================================================
-- Architecture & Review Notes:
-- 1. [Table Design & Multi-Device Account Persistence]
--    Tracks alerts that an authenticated farmer has chosen to remove from their
--    own radar view ("Remove from my radar").
--    - user_id: Foreign key to auth.users(id) with CASCADE on account deletion.
--    - outbreak_id: UUID foreign key to public.disease_outbreaks(id) with CASCADE
--      so when an outbreak is deleted from the community radar, all user hidden
--      references are automatically cleaned up.
--    - hidden_at: Audit timestamp in UTC.
--    - Composite PRIMARY KEY (user_id, outbreak_id) guarantees idempotency.
--    Replaces device-local browser localStorage so hidden status persists
--    across all devices (mobile, tablet, desktop) for that authenticated account.
-- 2. [Multi-Tenant Isolation & Zero Cross-Contamination]
--    - Hiding an outbreak inserts a row exclusively for the requesting user_id.
--    - The shared public.disease_outbreaks record is NEVER modified or deleted.
--    - Other farmers querying the radar continue to see the community report.
-- 3. [Row Level Security (RLS) & Explicit Grants]
--    - RLS is strictly enabled.
--    - Authenticated users are granted SELECT, INSERT, DELETE scoped to (auth.uid() = user_id).
--    - Service role is granted full access for backend API operations.
-- 4. [Separation of Concerns]
--    - Completely independent of the 30-day notification expiry cleanup cron.
--    - Completely independent of "Delete for everyone" (which removes the shared
--      outbreak and linked recipient notifications only when executed by the reporter).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_hidden_outbreaks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outbreak_id UUID NOT NULL REFERENCES public.disease_outbreaks(id) ON DELETE CASCADE,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, outbreak_id)
);

-- Fast indexes for radar queries scoped to user and cascade deletions on outbreak
CREATE INDEX IF NOT EXISTS idx_user_hidden_outbreaks_user_id
  ON public.user_hidden_outbreaks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_hidden_outbreaks_outbreak_id
  ON public.user_hidden_outbreaks(outbreak_id);

-- Explicit privilege grants
GRANT SELECT, INSERT, DELETE ON public.user_hidden_outbreaks TO authenticated;
GRANT ALL ON public.user_hidden_outbreaks TO service_role;

-- Enable Row Level Security
ALTER TABLE public.user_hidden_outbreaks ENABLE ROW LEVEL SECURITY;

-- 1. User policy: Farmers can only see and manage their own hidden list
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_hidden_outbreaks' 
      AND policyname = 'Users manage own hidden outbreaks'
  ) THEN
    CREATE POLICY "Users manage own hidden outbreaks"
      ON public.user_hidden_outbreaks
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. Service role policy for backend proxy operations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'user_hidden_outbreaks' 
      AND policyname = 'Service role manages hidden outbreaks'
  ) THEN
    CREATE POLICY "Service role manages hidden outbreaks"
      ON public.user_hidden_outbreaks
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
