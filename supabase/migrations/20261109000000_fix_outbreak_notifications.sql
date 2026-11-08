-- ============================================================================
-- CROP RADAR: AUTOMATIC OUTBREAK & NOTIFICATIONS RESILIENCE MIGRATION
-- ============================================================================

-- 1. Ensure notifications table has the precautions column for university guidelines
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS precautions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Ensure composite uniqueness to prevent duplicate notifications for the same recipient and outbreak
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_recipient_outbreak_unique
  ON public.notifications(recipient_user_id, outbreak_id)
  WHERE outbreak_id IS NOT NULL;

-- 3. Ensure disease_outbreaks has indices on coordinates and match score for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_disease_outbreaks_match_score
  ON public.disease_outbreaks(ai_match_score DESC);

CREATE INDEX IF NOT EXISTS idx_disease_outbreaks_created_at
  ON public.disease_outbreaks(created_at DESC);

-- 4. Enable service role policy for notifications creation if bypassrls is disabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Service role manages notifications'
  ) THEN
    CREATE POLICY "Service role manages notifications" ON public.notifications
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

