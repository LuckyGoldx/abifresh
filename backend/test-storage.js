// Test Supabase Storage
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('=== Testing Supabase Storage ===\n');

  // 1. List buckets
  console.log('1. Listing all buckets...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
  } else {
    console.log('✅ Buckets:', buckets.map(b => ({ name: b.name, public: b.public })));
  }

  // 2. Check payments bucket specifically
  console.log('\n2. Checking payments bucket...');
  const paymentsBucket = buckets?.find(b => b.name === 'payments');
  if (paymentsBucket) {
    console.log('✅ Payments bucket exists:', paymentsBucket);
    console.log('   Is public:', paymentsBucket.public);
  } else {
    console.log('❌ Payments bucket does NOT exist!');
  }

  // 3. List files in payments bucket
  console.log('\n3. Listing files in payments bucket...');
  const { data: files, error: filesError } = await supabase.storage
    .from('payments')
    .list('', { limit: 100 });
  
  if (filesError) {
    console.error('❌ Error listing files:', filesError);
  } else {
    console.log(`✅ Found ${files.length} files:`);
    files.forEach(f => {
      console.log(`   - ${f.name} (${f.metadata?.size || 'unknown'} bytes)`);
    });
  }

  // 4. Test specific file URL
  console.log('\n4. Testing specific file URLs...');
  if (files && files.length > 0) {
    const testFile = files[0];
    console.log(`   Testing file: ${testFile.name}`);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('payments')
      .getPublicUrl(testFile.name);
    
    console.log('   Public URL:', urlData.publicUrl);

    // Try to download it
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('payments')
      .download(testFile.name);
    
    if (downloadError) {
      console.error('   ❌ Download failed:', downloadError);
    } else {
      console.log('   ✅ Download successful! Size:', downloadData.size, 'bytes');
    }
  }

  // 5. Check bucket policies
  console.log('\n5. Attempting to access file via HTTP...');
  if (files && files.length > 0) {
    const testFile = files[0];
    const { data: urlData } = supabase.storage
      .from('payments')
      .getPublicUrl(testFile.name);
    
    console.log('   URL to test:', urlData.publicUrl);
    console.log('   (Test this URL in your browser)');
  }
}

test().catch(console.error);
