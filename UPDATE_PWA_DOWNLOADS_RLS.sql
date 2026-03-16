-- Update PWA downloads table RLS policies for better public access

-- First, disable RLS completely to test if that's the issue
ALTER TABLE pwa_downloads DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled, use these simple policies:
-- Uncomment the block below and comment out "DISABLE ROW LEVEL SECURITY" above

/*
-- Enable RLS
ALTER TABLE pwa_downloads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow anyone to track downloads" ON pwa_downloads;
DROP POLICY IF EXISTS "Allow authenticated users to read stats" ON pwa_downloads;
DROP POLICY IF EXISTS "Allow anyone to insert downloads" ON pwa_downloads;
DROP POLICY IF EXISTS "Allow anyone to read download stats" ON pwa_downloads;

-- Create permissive policies - allow everyone
CREATE POLICY "Enable insert for all users" ON pwa_downloads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON pwa_downloads
  FOR SELECT
  USING (true);

CREATE POLICY "Enable update for all users" ON pwa_downloads
  FOR UPDATE
  USING (true);
*/

-- Grant full permissions to anonymous users
GRANT SELECT, INSERT, UPDATE, DELETE ON pwa_downloads TO anon;
GRANT USAGE ON SEQUENCE pwa_downloads_id_seq TO anon;

-- Add a trigger to update created_at timestamp
CREATE OR REPLACE FUNCTION update_pwa_downloads_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = CURRENT_TIMESTAMP;
  IF NEW.downloaded_at IS NULL THEN
    NEW.downloaded_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pwa_downloads_timestamp ON pwa_downloads;

CREATE TRIGGER update_pwa_downloads_timestamp
BEFORE INSERT ON pwa_downloads
FOR EACH ROW
EXECUTE FUNCTION update_pwa_downloads_timestamp();
