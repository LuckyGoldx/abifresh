-- ============================================================================
-- STORAGE BUCKET POLICIES FOR PAYMENTS BUCKET
-- Execute in Supabase SQL Editor
-- ============================================================================

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to delete" ON storage.objects;

-- Create new policies for payments bucket

-- Allow authenticated users to upload receipts
CREATE POLICY "Allow authenticated to upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow users to read payment receipts
CREATE POLICY "Allow authenticated to read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'payments' AND
  auth.role() = 'authenticated'
);

-- Allow authenticated to update their own receipts
CREATE POLICY "Allow authenticated to update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated to delete their own receipts
CREATE POLICY "Allow authenticated to delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'payments' AND 
  auth.role() = 'authenticated'
);

-- Verify policies were created
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'Allow authenticated%';
