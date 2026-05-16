import { supabaseAdmin } from './supabase';

/**
 * Initialize Supabase storage buckets on backend startup
 * Creates the product-images bucket if it doesn't exist
 */
export async function initializeStorageBuckets() {
  try {
    console.log('🔄 Checking storage buckets...');

    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucketConfigs = [
      { name: 'product-images', public: true, fileSizeLimit: 5 * 1024 * 1024 },
      { name: 'credit-payments', public: true, fileSizeLimit: 5 * 1024 * 1024 },
    ];

    for (const config of bucketConfigs) {
      const existingBucket = buckets?.find((b) => b.name === config.name);

      if (!existingBucket) {
        console.log(`📦 ${config.name} bucket does not exist. Creating...`);

        const { error: createError } = await supabaseAdmin.storage.createBucket(
          config.name,
          {
            public: config.public,
            fileSizeLimit: config.fileSizeLimit,
          }
        );

        if (createError) {
          console.error(`❌ Error creating ${config.name} bucket:`, createError);
        } else {
          console.log(`✅ ${config.name} bucket created successfully`);
        }
      } else {
        console.log(`✅ ${config.name} bucket already exists`);
      }
    }
  } catch (error: any) {
    console.error('❌ Storage initialization error:', error.message);
  }
}
