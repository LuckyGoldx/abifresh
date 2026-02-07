-- ============================================================================
-- SUPABASE STORAGE - MAKE PAYMENTS BUCKET PUBLIC
-- Execute this SQL in Supabase SQL Editor to allow public access to receipt files
-- ============================================================================

-- Step 1: Enable storage for payments bucket if not already enabled
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Step 2: Create policy to allow public read access to all files in payments bucket
CREATE POLICY "Allow public read on payments bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'payments');

-- Step 3: Create policy to allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payments' 
  AND auth.role() = 'authenticated'
);

-- Step 4: Create policy to allow users to update their own files
CREATE POLICY "Allow users to update their own files"
ON storage.objects FOR UPDATE
WITH CHECK (
  bucket_id = 'payments' 
  AND auth.role() = 'authenticated'
);

-- Step 5: Create policy to allow users to delete their own files
CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payments' 
  AND auth.role() = 'authenticated'
);

-- Verify the bucket is now public
SELECT id, name, public FROM storage.buckets WHERE id = 'payments';
