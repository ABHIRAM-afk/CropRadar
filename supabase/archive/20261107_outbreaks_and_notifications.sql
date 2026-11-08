-- ============================================================================
-- CROP RADAR: SAFE ADDITIVE MIGRATION FOR MISSING OBJECTS ONLY
-- File: supabase/migrations/20261107_outbreaks_and_notifications.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CREATE MISSING TABLE: DISEASE OUTBREAKS
-- Strict match score > 0.700 gate; separated pathogen vs vector hosts;
-- exact coordinates shielded; NO verified-status column.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disease_outbreaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE SET NULL,
  crop TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  disease_category TEXT NOT NULL CHECK (disease_category IN ('fungal', 'bacterial', 'viral', 'pest', 'nutritional')),
  latitude DOUBLE PRECISION NOT NULL,             -- Shielded exact coordinate
  longitude DOUBLE PRECISION NOT NULL,            -- Shielded exact coordinate
  geohash TEXT NOT NULL,
  generalized_location TEXT NOT NULL,             -- Public-facing sector label
  symptoms TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  ai_match_score NUMERIC(4, 3) NOT NULL CHECK (ai_match_score > 0.700 AND ai_match_score <= 1.000),
  pathogen_susceptible_hosts JSONB NOT NULL DEFAULT '[]'::jsonb,
  vector_reservoir_hosts JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_broad_host_range BOOLEAN NOT NULL DEFAULT false,
  is_ai_assisted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outbreaks_coords ON public.disease_outbreaks(latitude, longitude);

-- ----------------------------------------------------------------------------
-- 2. CREATE MISSING TABLE: RECIPIENT NOTIFICATIONS
-- Scoped to recipient; separate host relevance; approximate distance flag;
-- authoritative citations for low-risk precautions; NO verified-status column.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outbreak_id UUID REFERENCES public.disease_outbreaks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('outbreak_nearby', 'weather_warning', 'resistance_alert')),
  target_relevance TEXT NOT NULL DEFAULT 'general_notice' CHECK (target_relevance IN ('direct_host', 'vector_host', 'broad_host', 'general_notice')),
  title_en TEXT NOT NULL,
  title_te TEXT NOT NULL,
  desc_en TEXT NOT NULL,
  desc_te TEXT NOT NULL,
  distance_km NUMERIC(5, 2),
  distance_is_approximate BOOLEAN NOT NULL DEFAULT true,
  reference_source_authority TEXT,
  reference_source_url TEXT,
  reference_review_date DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id, is_read, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY POLICIES (STRICT LEAST PRIVILEGE)
-- ----------------------------------------------------------------------------
ALTER TABLE public.disease_outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- disease_outbreaks: ZERO client INSERT policies. Only trusted server code inserts.
-- Authenticated users can view only outbreak rows they personally submitted.
CREATE POLICY "Users view own submitted outbreaks"
  ON public.disease_outbreaks FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_user_id);

-- notifications: ZERO client INSERT policies. Only trusted server code inserts.
-- Recipients can view only their own notifications.
CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_user_id);

-- Recipients can update only their own notifications (gated to is_read via column grant below).
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_user_id)
  WITH CHECK (auth.uid() = recipient_user_id);

-- ----------------------------------------------------------------------------
-- 4. EXPLICIT POSTGREST PERMISSION GRANTS
-- Required because "Automatically expose new tables" is disabled.
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- disease_outbreaks: Authenticated can only SELECT their own rows via RLS.
-- service_role has full access for server-side proximity calculation and inserts.
GRANT SELECT ON public.disease_outbreaks TO authenticated;
GRANT ALL ON public.disease_outbreaks TO service_role;

-- notifications: Authenticated can SELECT and UPDATE ONLY the `is_read` column.
-- service_role has full access for server-side notification generation.
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (is_read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- ----------------------------------------------------------------------------
-- 5. PRIVATE STORAGE POLICIES FOR crop-images BUCKET
-- Authenticated role only (includes anonymous guest accounts).
-- Anon role removed: unauthenticated visitors cannot access private crop images.
-- ----------------------------------------------------------------------------
CREATE POLICY "Authenticated farmers upload images to own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'crop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated farmers read own images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'crop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

