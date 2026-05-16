const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://cifzlkspxjghpgxhrwkg.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4';

const NEW_URL = 'https://wkyakaunbejmuzqnvgno.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndreWFrYXVuYmVqbXV6cW52Z25vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM2NjMwMiwiZXhwIjoyMDkzOTQyMzAyfQ.aV2Z7O4HrBGnOZSlYSMgjx5xkrTumPBGkEbpyS414JY';

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function copyBucket(bucketName, prefix = '') {
  console.log(`\nCopying ${bucketName}/${prefix}...`);

  const { data: files, error } = await oldClient.storage.from(bucketName).list(prefix, {
    limit: 200,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    console.log(`  Error listing: ${error.message}`);
    return;
  }

  if (!files || files.length === 0) {
    console.log('  No files found');
    return;
  }

  let copied = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = prefix ? `${prefix}/${file.name}` : file.name;

    try {
      // Get public URL from old
      const { data: publicUrlData } = oldClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        console.log(`  No public URL for: ${filePath}`);
        errors++;
        continue;
      }

      // Download via fetch
      const response = await fetch(publicUrlData.publicUrl);
      if (!response.ok) {
        console.log(`  Download failed: ${filePath} (${response.status})`);
        errors++;
        continue;
      }

      const blob = await response.blob();

      // Upload to new
      const { error: ulError } = await newClient.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: file.metadata?.mimetype || blob.type || 'application/octet-stream',
          upsert: true
        });

      if (ulError) {
        console.log(`  Upload error: ${filePath} - ${ulError.message}`);
        errors++;
      } else {
        copied++;
        if (copied % 10 === 0) {
          console.log(`  Progress: ${copied}/${files.length}`);
        }
      }
    } catch (e) {
      console.log(`  Error: ${filePath} - ${e.message}`);
      errors++;
    }
  }

  console.log(`  Done: ${copied} copied, ${errors} errors out of ${files.length} files`);
}

async function main() {
  console.log('COPYING STORAGE FILES FROM OLD TO NEW');
  console.log('======================================');

  await copyBucket('payments');
  await copyBucket('product-images');
  await copyBucket('product-images', 'products');

  console.log('\nStorage copy complete!');
}

main().catch(console.error);
