const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  console.error("   Example:");
  console.error("   $env:SUPABASE_URL=\"https://your-project.supabase.co\"");
  console.error("   $env:SUPABASE_SERVICE_ROLE_KEY=\"...\"");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  console.log("Testing Supabase Connection...\n");
  console.log("URL:", supabaseUrl);
  console.log("Key:", supabaseServiceKey.substring(0, 20) + "...\n");

  console.log("Test 1: Check project health");
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.log("  Cannot access users table:", error.message);
      console.log("   This might be normal if table does not exist yet\n");
    } else {
      console.log("  Users table is accessible!\n");
    }
  } catch (err) {
    console.log("  Connection error:", err.message, "\n");
  }

  console.log("Test 2: Check existing users");
  try {
    const { data: existingUsers, error: usersError } = await supabase
      .from("users")
      .select("email, role, is_active");

    if (usersError) {
      console.log("  Cannot query users:", usersError.message, "\n");
    } else if (existingUsers && existingUsers.length > 0) {
      console.log("  Found " + existingUsers.length + " existing users:");
      existingUsers.forEach(u => {
        console.log("   - " + u.email + " (" + u.role + ") " + (u.is_active ? "Active" : "Inactive"));
      });
      console.log("");
    } else {
      console.log("  No users found in database\n");
    }
  } catch (err) {
    console.log("  Error:", err.message, "\n");
  }

  console.log("Test 3: Check authentication users");
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.log("  Cannot list auth users:", authError.message, "\n");
    } else if (authUsers && authUsers.users && authUsers.users.length > 0) {
      console.log("  Found " + authUsers.users.length + " auth users:");
      authUsers.users.forEach(u => {
        console.log("   - " + u.email + " (created: " + new Date(u.created_at).toLocaleString() + ")");
      });
      console.log("");
    } else {
      console.log("  No authentication users found\n");
    }
  } catch (err) {
    console.log("  Error:", err.message, "\n");
  }

  console.log("Test 4: Test login with admin@abifresh.com");
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "admin@abifresh.com",
      password: "admin123"
    });

    if (authError) {
      console.log("  Login failed:", authError.message);
      console.log("   You need to run the SQL script to create users!\n");
    } else if (authData.user) {
      console.log("  Login successful!");
      console.log("   User ID:", authData.user.id);
      console.log("   Email:", authData.user.email);
      console.log("   Users are already set up correctly!\n");
    }
  } catch (err) {
    console.log("  Error:", err.message, "\n");
  }

  console.log("===========================================================");
  console.log("NEXT STEPS:");
  console.log("===========================================================");
  console.log("1. Go to https://supabase.com/dashboard");
  console.log("2. Select your project");
  console.log("3. Click SQL Editor -> New query");
  console.log("4. Copy and paste contents of SUPABASE_FRESH_USER_SETUP.sql");
  console.log("5. Click Run to execute");
  console.log("6. Check for success message");
  console.log("7. Run this test again to verify");
  console.log("===========================================================\n");
}

testConnection().then(() => {
  console.log("Test complete!\n");
  process.exit(0);
}).catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});