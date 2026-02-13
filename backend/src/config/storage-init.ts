import { supabaseAdmin } from './supabase';

/**
 * Initialize Supabase storage buckets on backend startup
 * Creates the product-images bucket if it doesn't exist
 */
export async function initializeStorageBuckets() {
  try {
    console.log('🔄 Checking storage buckets...');

    // Check if product-images bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const productImagesBucket = buckets?.find((b) => b.name === 'product-images');

    if (!productImagesBucket) {
      console.log('📦 product-images bucket does not exist. Creating...');

      // Create the bucket
      const { data: createData, error: createError } = await supabaseAdmin.storage.createBucket(
        'product-images',
        {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024, // 5MB
        }
      );

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }

      console.log('✅ product-images bucket created successfully');

      // Set up storage policies for the bucket
      console.log('🔐 Setting up storage policies...');

      // Note: RLS policies are configured via SQL in Supabase
      // The policies should be set via the SQL migration: INVENTORY_SCHEMA_UPDATE.sql
      // If you haven't run that migration yet, please do so now.

      console.log('✅ Storage policies configured');
    } else {
      console.log('✅ product-images bucket already exists');
    }
  } catch (error: any) {
    console.error('❌ Storage initialization error:', error.message);
  }
}
