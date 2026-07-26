-- ============================================================
-- CREATE IDEMPOTENCY KEYS TABLE
-- Prevents duplicate sale processing from double-submission,
-- network retries, and browser replays.
-- 
-- Run in Supabase SQL Editor. RLS not needed — only accessed
-- server-side via supabaseAdmin (service role key).
-- ============================================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- OPTIONAL: Schedule cleanup every 2 days at midnight
-- (requires pg_cron extension — Supabase Pro tier or above)
-- ============================================================
-- SELECT cron.schedule(
--   'cleanup-idempotency-keys',
--   '0 0 */2 * *',
--   $$DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '2 days'$$
-- );
