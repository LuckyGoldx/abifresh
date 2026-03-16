-- Diagnostic queries to troubleshoot download counting issues

-- 1. Check if table exists
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name = 'pwa_downloads';

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'pwa_downloads'
ORDER BY ordinal_position;

-- 3. Check how many records exist
SELECT COUNT(*) as total_records FROM pwa_downloads;

-- 4. Check actual data (sample records)
SELECT 
  id,
  platform,
  user_agent,
  downloaded_at,
  created_at
FROM pwa_downloads
ORDER BY downloaded_at DESC
LIMIT 10;

-- 5. Check date distribution (how many today, last 7 days, etc.)
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN downloaded_at >= NOW()::date THEN 1 END) as today,
  COUNT(CASE WHEN downloaded_at >= (NOW()::date - INTERVAL '7 days') THEN 1 END) as last_7_days,
  COUNT(CASE WHEN downloaded_at >= (NOW()::date - INTERVAL '30 days') THEN 1 END) as last_30_days,
  MIN(downloaded_at) as earliest_record,
  MAX(downloaded_at) as latest_record
FROM pwa_downloads;

-- 6. Check RLS policies
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'pwa_downloads'
ORDER BY policyname;

-- 7. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'pwa_downloads';
