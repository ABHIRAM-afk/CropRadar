-- ============================================================================
-- CROP RADAR: SECURED NOTIFICATIONS RETENTION & DAILY CRON MIGRATION
-- Prepared for review - DO NOT RUN DIRECTLY WITHOUT REVIEW
-- ============================================================================
-- Architecture & Review Notes:
-- 1. [RLS Security] Explicit DELETE policy: auth.uid() = recipient_user_id.
--    Users can ONLY delete their own alerts; shared disease_outbreaks and radar
--    map data remain completely untouched.
-- 2. [Index Performance]
--    a. idx_notifications_recipient_created_at: Optimizes user inbox fetch & sort.
--    b. idx_notifications_created_at: Dedicated index on created_at enables fast
--       range scans for date cleanup without sequential table scans.
-- 3. [Function Design & Accurate Locking Behavior]
--    a. PostgreSQL functions execute entirely within a single transaction
--       (subtransactions cannot independently commit). A PL/pgSQL loop inside a
--       function does NOT release locks or commit WAL between iterations.
--    b. This function uses a single atomic bounded statement (LIMIT max_rows,
--       default 5,000) or an unbounded indexed scan (when max_rows IS NULL).
--       Each invocation runs and commits in milliseconds, strictly capping lock
--       footprint and execution duration.
--    c. Hardened with SECURITY DEFINER and SET search_path = pg_catalog, pg_temp.
--       Because all application tables are schema-qualified (public.notifications),
--       excluding public from the search_path completely prevents schema
--       shadowing of built-in operators and functions.
-- 4. [Least-Privilege Privilege Lockdown]
--    Default PUBLIC/anon/authenticated execution is revoked. Only postgres and
--    service_role are granted EXECUTE.
-- 5. [Idempotent pg_cron Daily Schedule]
--    Uses named dollar-quotes ($cron_setup$) and standard string literals for the
--    command, eliminating any nested dollar-quoting parser errors. Safely
--    unschedules previous versions by jobid before re-registering.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER-SCOPED RLS DELETE POLICY
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Users delete own notifications'
  ) THEN
    CREATE POLICY "Users delete own notifications" ON public.notifications
      FOR DELETE
      USING (auth.uid() = recipient_user_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. DUAL INDICES FOR USER INBOX & TABLE EXPIRY CLEANUP
-- ----------------------------------------------------------------------------
-- Fast inbox retrieval & 30-day active window per user
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created_at
  ON public.notifications(recipient_user_id, created_at DESC);

-- Fast system-wide date-range scan for cron cleanup (no sequential scan)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at);

-- ----------------------------------------------------------------------------
-- 3. HARDENED STORED PROCEDURE (ATOMIC BOUNDED DELETE & SEARCH_PATH SECURED)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.cleanup_expired_notifications();
DROP FUNCTION IF EXISTS public.cleanup_expired_notifications(integer);

CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications(max_rows integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Validate max_rows parameter boundary
  IF max_rows IS NOT NULL AND max_rows <= 0 THEN
    max_rows := 5000;
  END IF;

  IF max_rows IS NOT NULL THEN
    -- Bounded atomic deletion:
    -- Deletes up to max_rows in a single atomic statement, using idx_notifications_created_at.
    -- Bounding to max_rows ensures predictable lock duration and fast execution per invocation.
    WITH doomed AS (
      SELECT id
      FROM public.notifications
      WHERE created_at < NOW() - INTERVAL '30 days'
      ORDER BY created_at ASC
      LIMIT max_rows
    )
    DELETE FROM public.notifications n
    USING doomed
    WHERE n.id = doomed.id;
  ELSE
    -- Unbounded atomic deletion:
    -- Purges all expired notifications in a single index scan using idx_notifications_created_at.
    DELETE FROM public.notifications
    WHERE created_at < NOW() - INTERVAL '30 days';
  END IF;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RESTRICT EXECUTION PRIVILEGES (LEAST PRIVILEGE LOCKDOWN)
-- ----------------------------------------------------------------------------
-- Prevent unauthenticated or authenticated web users from invoking via PostgREST RPC
REVOKE ALL ON FUNCTION public.cleanup_expired_notifications(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_notifications(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_notifications(integer) FROM authenticated;

-- Allow only database administrator and internal service role
GRANT EXECUTE ON FUNCTION public.cleanup_expired_notifications(integer) TO postgres;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_notifications(integer) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. REAL DAILY SCHEDULE (IDEMPOTENT PG_CRON SETUP)
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron_setup$
DECLARE
  v_job_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Ensure postgres role has usage on the cron schema
    GRANT USAGE ON SCHEMA cron TO postgres;

    -- Unschedule previous job if registered to guarantee idempotency across re-runs
    SELECT jobid INTO v_job_id
    FROM cron.job
    WHERE jobname = 'cleanup-expired-notifications'
    LIMIT 1;

    IF v_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_job_id);
    END IF;

    -- Schedule daily execution at 03:00 UTC (08:30 AM IST, agricultural off-peak)
    PERFORM cron.schedule(
      'cleanup-expired-notifications',
      '0 3 * * *',
      'SELECT public.cleanup_expired_notifications(5000);'
    );
  END IF;
END $cron_setup$;
