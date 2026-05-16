const fs = require('fs');

const schema = fs.readFileSync('SCHEMA_ONLY.sql', 'utf8');
const data = fs.readFileSync('COMPLETE_DATABASE_DUMP.sql', 'utf8');

let master = `-- ============================================================================
-- AKV COMPLETE DATABASE MIGRATION
-- Source: cifzlkspxjghpgxhrwkg (OLD)
-- Target: wkyakaunbejmuzqnvgno (NEW)
-- Generated: ${new Date().toISOString()}
-- ============================================================================

-- ⚠️ IMPORTANT: Run this ENTIRE script in the NEW project's Supabase SQL Editor
-- ============================================================================

-- Clear existing data first (reverse order to respect FKs)
DO $$ DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(tbl) || ' CASCADE';
  END LOOP;
END $$;

`;

master += schema;

master += `
-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- 1. Payments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payments', 'payments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Payments bucket policies
DROP POLICY IF EXISTS "Allow authenticated to upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to read" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to update" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated to delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read on payments bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

CREATE POLICY "Allow authenticated to upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to read" ON storage.objects
FOR SELECT USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to update" ON storage.objects
FOR UPDATE USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated to delete" ON storage.objects
FOR DELETE USING (bucket_id = 'payments' AND auth.role() = 'authenticated');

-- Product-images bucket policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'product-images');

`;

// Add data (skip the header lines from the data dump)
const dataLines = data.split('\n');
let dataBody = '';
let inData = false;
for (const line of dataLines) {
  if (line.startsWith('SET session_replication_role')) {
    dataBody += line + '\n';
    inData = true;
    continue;
  }
  if (inData) dataBody += line + '\n';
}

master += dataBody;

const outPath = 'c:\\Users\\LuckyGold\\Desktop\\AKV - Copy\\MASTER_MIGRATION.sql';
fs.writeFileSync(outPath, master, 'utf8');

const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
console.log('Master migration file created!');
console.log('Output: ' + outPath);
console.log('Size: ' + sizeMB + ' MB');
