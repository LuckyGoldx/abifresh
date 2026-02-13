-- ============================================================
-- ABIFRESH Inventory Schema Update
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add new columns to items table for brand/package/pricing structure
-- ============================================================

-- Brand name (Level 1) - e.g., "LEBRACE BABY DIAPERS"
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS brand VARCHAR(255);

-- Package type (Level 2) - e.g., "LEBRACE SACHET ROLL"
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS package_type VARCHAR(255);

-- Price per carton/bag in Jalingo marketplace
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS price_jalingo DECIMAL(10, 2) DEFAULT 0;

-- Price per carton/bag outside Jalingo
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS price_outside DECIMAL(10, 2) DEFAULT 0;

-- Image URL for product photo (stored in Supabase Storage)
-- Note: image_url column already exists in the schema, so this is just a safety check
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS image_url TEXT;


-- 2. Verify the columns were added
-- ============================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'items' 
  AND table_schema = 'public'
ORDER BY ordinal_position;


-- ============================================================
-- SUPABASE STORAGE SETUP FOR PRODUCT IMAGES
-- ============================================================

-- 3. Create a storage bucket for product images
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB max file size
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;


-- 4. Storage policies - Allow authenticated users to upload
-- ============================================================
-- Note: These policies may already exist, which is fine.
-- If you get "policy already exists" error, you can continue - the setup is already complete.

-- Policy: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Policy: Allow public read access to product images
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Allow authenticated users to update their uploads
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
CREATE POLICY "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- Policy: Allow authenticated users to delete images
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
CREATE POLICY "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');


-- ============================================================
-- DONE! After running this script:
-- 
-- New columns added to items table:
--   - brand (VARCHAR 255) - Brand name from catalog
--   - package_type (VARCHAR 255) - Package type from catalog  
--   - price_jalingo (DECIMAL) - Price in Jalingo
--   - price_outside (DECIMAL) - Price outside Jalingo
--   - image_url (TEXT) - Product image URL
--
-- Storage bucket created:
--   - Bucket: "product-images"
--   - Max size: 5MB
--   - Allowed types: JPEG, PNG, WebP, GIF
--   - Public read access enabled
--   - Authenticated upload/update/delete enabled
-- ============================================================
