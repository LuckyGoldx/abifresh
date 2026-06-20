const { createClient } = require("@supabase/supabase-js");

const OLD_URL = process.env.OLD_SUPABASE_URL || "";
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || "";
const NEW_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const NEW_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!OLD_URL || !OLD_KEY) {
  console.error("Missing OLD_SUPABASE_URL or OLD_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!NEW_URL || !NEW_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_KEY);
const newClient = createClient(NEW_URL, NEW_KEY);

async function copyBucket(bucketName, prefix = "") {
  console.log("\nCopying " + bucketName + "/" + prefix + "...");

  const { data: files, error } = await oldClient.storage.from(bucketName).list(prefix, {
    limit: 200,
    offset: 0,
    sortBy: { column: "name", order: "asc" }
  });

  if (error) {
    console.log("  Error listing: " + error.message);
    return;
  }

  if (!files || files.length === 0) {
    console.log("  No files found");
    return;
  }

  let copied = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = prefix ? prefix + "/" + file.name : file.name;

    try {
      const { data: publicUrlData } = oldClient.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        console.log("  No public URL for: " + filePath);
        errors++;
        continue;
      }

      const response = await fetch(publicUrlData.publicUrl);
      if (!response.ok) {
        console.log("  Download failed: " + filePath + " (" + response.status + ")");
        errors++;
        continue;
      }

      const blob = await response.blob();

      const { error: ulError } = await newClient.storage
        .from(bucketName)
        .upload(filePath, blob, {
          contentType: file.metadata && file.metadata.mimetype ? file.metadata.mimetype : (blob.type || "application/octet-stream"),
          upsert: true
        });

      if (ulError) {
        console.log("  Upload error: " + filePath + " - " + ulError.message);
        errors++;
      } else {
        copied++;
        if (copied % 10 === 0) {
          console.log("  Progress: " + copied + "/" + files.length);
        }
      }
    } catch (e) {
      console.log("  Error: " + filePath + " - " + e.message);
      errors++;
    }
  }

  console.log("  Done: " + copied + " copied, " + errors + " errors out of " + files.length + " files");
}

async function main() {
  console.log("COPYING STORAGE FILES FROM OLD TO NEW");
  console.log("======================================");

  await copyBucket("payments");
  await copyBucket("product-images");
  await copyBucket("product-images", "products");

  console.log("\nStorage copy complete!");
}

main().catch(console.error);