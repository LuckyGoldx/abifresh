-- ============================================================================
-- AKV (ABIFRESH) - BACKUP HISTORY TABLE
-- ============================================================================
-- Run this in Supabase SQL Editor to enable persistent backup history tracking.
-- Date: February 21, 2026
-- ============================================================================

-- ── 1. Create the table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.backup_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- When the backup was triggered
  triggered_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Who triggered the backup (FK to public.users; nullable if triggered by system)
  triggered_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  -- Human-readable email / name snapshot at backup time
  triggered_by_name  TEXT,
  -- Total number of tables included in this backup
  tables_count   INTEGER NOT NULL DEFAULT 0,
  -- Total rows across all included tables
  total_rows     BIGINT  NOT NULL DEFAULT 0,
  -- Format: 'excel' | 'csv' | 'excel-all' | 'csv-all'
  format         VARCHAR(20) NOT NULL,
  -- Exported file name (e.g. abifresh_2026-02-21.xlsx)
  file_name      TEXT NOT NULL,
  -- Duration of the export operation in milliseconds
  duration_ms    INTEGER NOT NULL DEFAULT 0,
  -- Array of table names included in the backup (JSONB array of strings)
  table_names    JSONB NOT NULL DEFAULT '[]',
  -- 'success' | 'error'
  status         VARCHAR(10) NOT NULL DEFAULT 'success',
  -- Optional error message when status = 'error'
  error_message  TEXT,
  -- Standard timestamp
  created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_backup_history_triggered_at
  ON public.backup_history (triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_history_triggered_by
  ON public.backup_history (triggered_by);

CREATE INDEX IF NOT EXISTS idx_backup_history_status
  ON public.backup_history (status);

CREATE INDEX IF NOT EXISTS idx_backup_history_format
  ON public.backup_history (format);

-- ── 2. Enable Row Level Security ─────────────────────────────────────────────
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- ── 3. RLS Policies ──────────────────────────────────────────────────────────

-- Admin can view ALL backup history
DROP POLICY IF EXISTS "admin_view_backup_history" ON public.backup_history;
CREATE POLICY "admin_view_backup_history" ON public.backup_history
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Admin can insert (record new backups)
DROP POLICY IF EXISTS "admin_insert_backup_history" ON public.backup_history;
CREATE POLICY "admin_insert_backup_history" ON public.backup_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- Admin can delete backup history entries
DROP POLICY IF EXISTS "admin_delete_backup_history" ON public.backup_history;
CREATE POLICY "admin_delete_backup_history" ON public.backup_history
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role = 'admin'
    )
  );

-- ── 4. Also allow anonymous service-role access for server-side inserts ───────
-- (Uncomment if you use a service-role key in an API/edge function instead of
--  the anon key from the browser client)
-- DROP POLICY IF EXISTS "service_role_full_access" ON public.backup_history;
-- CREATE POLICY "service_role_full_access" ON public.backup_history
--   FOR ALL USING (auth.role() = 'service_role');

-- ── 5. Helpful view for quick inspection ─────────────────────────────────────
CREATE OR REPLACE VIEW public.v_backup_history AS
  SELECT
    bh.id,
    bh.triggered_at,
    bh.triggered_by_name,
    bh.tables_count,
    bh.total_rows,
    bh.format,
    bh.file_name,
    bh.duration_ms,
    bh.status,
    jsonb_array_length(bh.table_names)  AS included_tables_count,
    bh.table_names,
    bh.error_message,
    bh.created_at
  FROM public.backup_history bh
  ORDER BY bh.triggered_at DESC;

-- ── 6. Grant view access to authenticated users (read-only dashboard) ─────────
-- GRANT SELECT ON public.v_backup_history TO authenticated;

-- ============================================================================
-- DONE — backup_history table is ready.
-- ============================================================================
-- Column reference:
--
--  id                UUID          PK, auto-generated
--  triggered_at      TIMESTAMPTZ   when backup was started (default: now())
--  triggered_by      UUID          FK → users.id (nullable)
--  triggered_by_name TEXT          name snapshot at backup time
--  tables_count      INT           number of tables exported
--  total_rows        BIGINT        sum of all rows across all tables
--  format            VARCHAR(20)   'excel' | 'csv' | 'excel-all' | 'csv-all'
--  file_name         TEXT          exported file name
--  duration_ms       INT           export duration in milliseconds
--  table_names       JSONB         ["users","items",...]
--  status            VARCHAR(10)   'success' | 'error'
--  error_message     TEXT          null on success
--  created_at        TIMESTAMPTZ   same as triggered_at (row creation time)
-- ============================================================================
