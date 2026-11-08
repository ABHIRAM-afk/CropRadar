-- ============================================================================
-- CROP RADAR: HARDENED POSTGRES SCHEMA MIGRATION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (Linked to auth.users, supports Anonymous & Google accounts)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Farmer',
  avatar_url TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'te')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Hardened profile creation trigger with fixed search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, is_anonymous)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Farmer'),
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.is_anonymous, false)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    is_anonymous = EXCLUDED.is_anonymous,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, service_role;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. FARMS (Location requires explicit activation; NO fixed acreage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL DEFAULT 'My Farm',
  village_sector TEXT NOT NULL DEFAULT 'Unconfigured Sector',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geohash TEXT,
  location_source TEXT DEFAULT 'none' CHECK (location_source IN ('none', 'sector_centroid', 'gps')),
  has_explicit_location BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_farms_lookup ON public.farms(user_id, has_explicit_location);

-- ----------------------------------------------------------------------------
-- 3. CROP CYCLES (Composite foreign key prevents cross-tenant farm linkage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crop_cycles (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL,
  crop_name_en TEXT NOT NULL DEFAULT 'Chilli',
  crop_name_te TEXT NOT NULL DEFAULT 'మిరప',
  cycle_label TEXT NOT NULL DEFAULT 'Kharif 2026',
  sowing_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'harvested', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (id),
  FOREIGN KEY (farm_id, user_id) REFERENCES public.farms(id, user_id) ON DELETE CASCADE,
  UNIQUE (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crop_cycles_active ON public.crop_cycles(user_id, status);

-- ----------------------------------------------------------------------------
-- 4. CHAT MESSAGES (Scoped to owned crop cycle)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crop_cycle_id UUID NOT NULL REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('farmer', 'assistant')),
  text_en TEXT NOT NULL,
  text_te TEXT,
  image_storage_path TEXT,
  diagnosis_payload JSONB,
  weather_card_payload JSONB,
  outbreak_alert_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_cycle ON public.chat_messages(crop_cycle_id, created_at ASC);

-- ----------------------------------------------------------------------------
-- 5. FIELD DIARY (Composite foreign key prevents cross-tenant cycle linkage)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.field_diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_cycle_id UUID NOT NULL,
  crop_name TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  confidence TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  image_storage_path TEXT,
  treated_area_acres NUMERIC(6, 2),
  total_chemical_used TEXT,
  treatments_recorded JSONB DEFAULT '[]'::jsonb,
  weather_snapshot TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  FOREIGN KEY (crop_cycle_id, user_id) REFERENCES public.crop_cycles(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_field_diary_lookup ON public.field_diary_entries(user_id, crop_cycle_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. DISEASE OUTBREAKS (Separated pathogen & vector hosts; match score > 0.700 gate)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.disease_outbreaks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source_crop_cycle_id UUID REFERENCES public.crop_cycles(id) ON DELETE SET NULL,
  crop TEXT NOT NULL,
  disease_name TEXT NOT NULL,
  disease_category TEXT NOT NULL CHECK (disease_category IN ('fungal', 'bacterial', 'viral', 'pest', 'nutritional')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  geohash TEXT NOT NULL,
  generalized_location TEXT NOT NULL,
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

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS (Host-targeted alerts with extension-reviewed precautions)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- 1. Profiles
  DROP POLICY IF EXISTS "Users view and update own profile" ON public.profiles;
  CREATE POLICY "Users view and update own profile" ON public.profiles FOR ALL
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

  -- 2. Farms
  DROP POLICY IF EXISTS "Users manage own farm" ON public.farms;
  CREATE POLICY "Users manage own farm" ON public.farms FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

  -- 3. Crop Cycles
  DROP POLICY IF EXISTS "Users manage own crop cycles" ON public.crop_cycles;
  CREATE POLICY "Users manage own crop cycles" ON public.crop_cycles FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.farms WHERE farms.id = farm_id AND farms.user_id = auth.uid())
    );

  -- 4. Chat Messages
  DROP POLICY IF EXISTS "Users manage own cycle messages" ON public.chat_messages;
  CREATE POLICY "Users manage own cycle messages" ON public.chat_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM public.crop_cycles WHERE crop_cycles.id = chat_messages.crop_cycle_id AND crop_cycles.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.crop_cycles WHERE crop_cycles.id = chat_messages.crop_cycle_id AND crop_cycles.user_id = auth.uid()));

  -- 5. Field Diary
  DROP POLICY IF EXISTS "Users manage own field diary" ON public.field_diary_entries;
  CREATE POLICY "Users manage own field diary" ON public.field_diary_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (
      auth.uid() = user_id AND
      EXISTS (SELECT 1 FROM public.crop_cycles WHERE crop_cycles.id = crop_cycle_id AND crop_cycles.user_id = auth.uid())
    );

  -- 6. Outbreaks
  DROP POLICY IF EXISTS "Reporters insert own reports" ON public.disease_outbreaks;
  DROP POLICY IF EXISTS "Reporters view own reports" ON public.disease_outbreaks;
  CREATE POLICY "Reporters insert own reports" ON public.disease_outbreaks FOR INSERT
    WITH CHECK (auth.uid() = reporter_user_id);
  CREATE POLICY "Reporters view own reports" ON public.disease_outbreaks FOR SELECT
    USING (auth.uid() = reporter_user_id);

  -- 7. Notifications
  DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
  CREATE POLICY "Users access own notifications" ON public.notifications FOR ALL
    USING (auth.uid() = recipient_user_id) WITH CHECK (auth.uid() = recipient_user_id);
END $$;
