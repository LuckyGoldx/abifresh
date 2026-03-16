-- Test if direct insert works in SQL (as admin/service role)
INSERT INTO pwa_downloads (platform, user_agent, downloaded_at)
VALUES (
  'Test Platform',
  'Test User Agent',
  NOW()
)
RETURNING id, platform, user_agent, downloaded_at, created_at;

-- Verify the insert worked
SELECT COUNT(*) as total FROM pwa_downloads;

-- View recent inserts
SELECT * FROM pwa_downloads ORDER BY downloaded_at DESC LIMIT 5;