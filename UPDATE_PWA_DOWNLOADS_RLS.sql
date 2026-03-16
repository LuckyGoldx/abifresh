-- Update PWA downloads table RLS policies for better public access

-- Drop existing policies if they exist (ignore errors if they don't exist)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow anyone to track downloads" ON pwa_downloads;
  DROP POLICY IF EXISTS "Allow authenticated users to read stats" ON pwa_downloads;
  DROP POLICY IF EXISTS "Allow anyone to insert downloads" ON pwa_downloads;
  DROP POLICY IF EXISTS "Allow anyone to read download stats" ON pwa_downloads;
EXCEPTION WHEN OTHERS THEN
  NULL; -- Ignore any errors
END $$;

-- Create new permissive policies for public access
-- Allow anyone (including anonymous) to insert
CREATE POLICY "Allow anyone to insert downloads" ON pwa_downloads
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to read (anonymous can view stats)
CREATE POLICY "Allow anyone to read download stats" ON pwa_downloads
  FOR SELECT
  TO public
  USING (true);

-- Optional: Add a trigger to update created_at timestamp
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
