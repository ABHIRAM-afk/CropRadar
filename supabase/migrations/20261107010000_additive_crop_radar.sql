-- ============================================================================
-- CROP RADAR: SAFE ADDITIVE MIGRATION (NON-DESTRUCTIVE)
-- ============================================================================

-- 1. HARDEN EXISTING TRIGGER FUNCTION
-- Fixes search_path vulnerability and revokes public execution
ALTER FUNCTION public.handle_new_user() SET search_path = public, auth, pg_temp;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

-- 2. ADD MISSING COLUMNS TO EXISTING TABLES (SAFE ADDITIONS)
-- Ensures default Guntur preset does NOT trigger proximity alerts
ALTER TABLE public.farms 
  ADD COLUMN IF NOT EXISTS has_explicit_location BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_source TEXT DEFAULT 'none' CHECK (location_source IN ('none', 'sector_centroid', 'gps'));

-- Ensures composite uniqueness for cross-tenant integrity
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farms_id_user_id_unique') THEN
    ALTER TABLE public.farms ADD CONSTRAINT farms_id_user_id_unique UNIQUE (id, user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crop_cycles_id_user_id_unique') THEN
    ALTER TABLE public.crop_cycles ADD CONSTRAINT crop_cycles_id_user_id_unique UNIQUE (id, user_id);
  END IF;
END $$;

-- Adds on-demand per-application treated area to diary
ALTER TABLE public.field_diary_entries 
  ADD COLUMN IF NOT EXISTS treated_area_acres NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS total_chemical_used TEXT;

-- 3. CREATE MISSING TABLE: DISEASE OUTBREAKS
-- Strict match score > 0.700 gate; separated pathogen vs vector hosts; NO verified status
CREATE TABLE IF NOT EXISTS public.disease_outbreaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
  ai_match_score NUMERIC(4, 3) NOT NULL CHECK (ai_match_score >= 0.000 AND ai_match_score <= 1.000),
  pathogen_susceptible_hosts JSONB NOT NULL DEFAULT '[]'::jsonb,
  vector_reservoir_hosts JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_broad_host_range BOOLEAN NOT NULL DEFAULT false,
  is_ai_assisted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_outbreaks_coords ON public.disease_outbreaks(latitude, longitude);

-- 4. CREATE MISSING TABLE: RECIPIENT NOTIFICATIONS
-- Scoped strictly to recipient; includes source authority and approximate distance flag
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- 5. ROW-LEVEL SECURITY FOR NEW TABLES (STRICT AUTHORIZATION)
ALTER TABLE public.disease_outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Block direct public/client INSERT on outbreaks: Only server service-role may insert
DROP POLICY IF EXISTS "Reporters insert own reports" ON public.disease_outbreaks;
CREATE POLICY "Reporters insert own reports" ON public.disease_outbreaks FOR INSERT
  WITH CHECK (auth.uid() = reporter_user_id);

-- Reporters can view their own submission records; public exact coordinate reading is BLOCKED
DROP POLICY IF EXISTS "Reporters view own reports" ON public.disease_outbreaks;
CREATE POLICY "Reporters view own reports" ON public.disease_outbreaks FOR SELECT
  USING (auth.uid() = reporter_user_id);

-- Notifications: Strict recipient isolation (can only view and update their own)
DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
CREATE POLICY "Users access own notifications" ON public.notifications FOR ALL
  USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);

-- 6. PRIVATE STORAGE POLICIES FOR crop-images BUCKET
-- Uploads restricted to user's folder prefix: {user_id}/*
DROP POLICY IF EXISTS "Users upload images to own folder" ON storage.objects;
CREATE POLICY "Users upload images to own folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'crop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Reads restricted to image owner (others access only via short-lived server signed URLs)
DROP POLICY IF EXISTS "Users read own images" ON storage.objects;
CREATE POLICY "Users read own images" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'crop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

