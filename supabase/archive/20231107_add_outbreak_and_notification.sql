-- 20231107_add_outbreak_and_notification.sql
-- ------------------------------------------------------------
-- Add the missing disease_outbreaks and notifications tables,
-- together with secure RLS policies and storage bucket policies.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 1️⃣ disease_outbreaks table
-- ------------------------------------------------------------
create table public.disease_outbreaks (
  id                uuid   primary key default uuid_generate_v4(),
  farm_id           uuid   not null references public.farms(id),
  crop_cycle_id     uuid   not null references public.crop_cycles(id),
  disease_id        uuid   not null,
  match_score       real   not null check (match_score > 0.0 and match_score <= 1.0),
  ai_assisted       boolean default true,
  reported_at       timestamptz default now(),
  location          geometry(Point,4326) not null,
  image_path        text,
  notes             text
);

alter table public.disease_outbreaks enable row level security;

-- Only the trusted server (service_role) may INSERT/UPDATE/DELETE outbreak rows.
create policy "service_insert_outbreaks"
  on public.disease_outbreaks
  for insert
  using (auth.role() = 'service_role');

create policy "service_modify_outbreaks"
  on public.disease_outbreaks
  for update, delete
  using (auth.role() = 'service_role');

-- Farmers can SELECT only outbreaks that belong to farms they own.
create policy "select_own_outbreaks"
  on public.disease_outbreaks
  for select
  using (
    exists (
      select 1
      from public.farms f
      where f.id = disease_outbreaks.farm_id
        and f.user_id = auth.uid()
    )
  );

----------------------------------------------------------------
-- 2️⃣ notifications table (per‑user recipient notifications)
----------------------------------------------------------------
create table public.notifications (
  id                uuid   primary key default uuid_generate_v4(),
  recipient_user_id uuid   not null references public.profiles(id),
  outbreak_id       uuid   references public.disease_outbreaks(id),
  title             text   not null,
  body              text,
  created_at        timestamptz default now(),
  read              boolean    default false
);

alter table public.notifications enable row level security;

-- Only the trusted server may INSERT/UPDATE/DELETE notification rows.
create policy "service_insert_notifications"
  on public.notifications
  for insert
  using (auth.role() = 'service_role');

create policy "service_modify_notifications"
  on public.notifications
  for update, delete
  using (auth.role() = 'service_role');

-- A user can SELECT only his own notification rows.
create policy "select_own_notifications"
  on public.notifications
  for select
  using (recipient_user_id = auth.uid());

----------------------------------------------------------------
-- 3️⃣ Storage bucket policies (crop‑images)
----------------------------------------------------------------
-- The bucket *crop-images* already exists. We only add policies.

-- Authenticated users (including guest sessions that have been linked to a Google account)
-- may upload images.
create policy "authenticated_upload_crop_images"
  on storage.objects
  for insert
  using (
    bucket_id = 'crop-images' and
    auth.role() = 'authenticated'
  );

-- Authenticated users may read images they own (the bucket is private, so we just
-- allow any authenticated read; the server will enforce owner checks on the
-- related rows).
create policy "authenticated_read_crop_images"
  on storage.objects
  for select
  using (
    bucket_id = 'crop-images' and
    auth.role() = 'authenticated'
  );

-- NOTE: we intentionally **do not** grant any permissions to the `anon` role.

