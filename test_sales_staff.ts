// @ts-nocheck
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  console.error("   and SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSalesStaff() {
  console.log("Checking users in Supabase...\n");

  const { data: allUsers, error: allError } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .order("role");

  if (allError) {
    console.error("Error fetching all users:", allError);
    return;
  }

  console.log("Total users: " + (allUsers ? allUsers.length : 0));
  console.log("All users:");
  allUsers && allUsers.forEach((u) => {
    console.log("   - " + u.email.padEnd(25) + " | Role: \"" + u.role.padEnd(20) + "\" | Name: " + u.full_name);
  });

  const uniqueRoles = Array.from(new Set(allUsers && allUsers.map(u => u.role) || []));
  console.log("\n  Unique roles found: " + uniqueRoles.join(", "));

  console.log("\n  Looking for users with role IN [\"sales\", \"sales_staff\"]...");
  const { data: salesUsers, error: salesError } = await supabase
    .from("users")
    .select("id, email, full_name, role")
    .in("role", ["sales", "sales_staff"]);

  if (salesError) {
    console.error("Error fetching sales staff:", salesError);
    return;
  }

  console.log("  Found " + (salesUsers ? salesUsers.length : 0) + " sales staff:");
  salesUsers && salesUsers.forEach((u) => {
    console.log("   - " + u.email.padEnd(25) + " | Role: \"" + u.role + "\" | Name: " + u.full_name);
  });

  if ((salesUsers ? salesUsers.length : 0) === 0) {
    console.log("\n  No sales staff found with role \"sales\" or \"sales_staff\"");
    console.log("Available roles in system:", uniqueRoles);
    console.log("\nTrying alternative queries...");

    for (const role of uniqueRoles) {
      const { data: usersWithRole } = await supabase
        .from("users")
        .select("id, email, full_name, role")
        .eq("role", role);

      console.log("\n   Role \"" + role + "\": " + (usersWithRole ? usersWithRole.length : 0) + " users");
      usersWithRole && usersWithRole.forEach((u) => {
        console.log("      - " + u.email.padEnd(25) + " | " + u.full_name);
      });
    }
  }
}

checkSalesStaff().catch(console.error);