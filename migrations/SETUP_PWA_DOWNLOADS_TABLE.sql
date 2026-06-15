-- Create PWA downloads tracking table
CREATE TABLE IF NOT EXISTS pwa_downloads (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(50) DEFAULT 'web',
  user_agent TEXT,
  ip_address INET,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pwa_downloads_downloaded_at ON pwa_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pwa_downloads_platform ON pwa_downloads(platform);
CREATE INDEX IF NOT EXISTS idx_pwa_downloads_created_at ON pwa_downloads(created_at DESC);

-- Enable RLS
ALTER TABLE pwa_downloads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert
CREATE POLICY "Allow anyone to track downloads" ON pwa_downloads
  FOR INSERT
  WITH CHECK (true);

-- Only allow public read for stats endpoint (if needed for auth)
CREATE POLICY "Allow authenticated users to read stats" ON pwa_downloads
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT ON pwa_downloads TO anon;
GRANT SELECT, INSERT ON pwa_downloads TO authenticated;

-- Optional: Add a view for quick stats
CREATE OR REPLACE VIEW pwa_download_stats AS
SELECT
  COUNT(*) as total_downloads,
  COUNT(DISTINCT DATE(downloaded_at)) as unique_days_with_downloads,
  COUNT(CASE WHEN downloaded_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as downloads_last_7_days,
  COUNT(CASE WHEN downloaded_at > CURRENT_TIMESTAMP - INTERVAL '1 day' THEN 1 END) as downloads_last_24h,
  MAX(downloaded_at) as latest_download
FROM pwa_downloads;
