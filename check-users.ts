import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("{0} Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables", String.fromCharCode(0x274C));
  console.error("   Set them in your .env file or export them before running this script.");
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkUsers() {
  console.log("{0} Checking users in Supabase...\n", String.fromCharCode(0x1F50D));

  const { data: users, error } = await supabaseAdmin
    .from("users")
    .select("id, email, username, full_name, role, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("{0} Error fetching users:", String.fromCharCode(0x274C), error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log("{0}  No users found in the database!", String.fromCharCode(0x26A0));
    return;
  }

  console.log("{0} Found " + users.length + " users:\n", String.fromCharCode(0x2705));
  console.table(users);
}

checkUsers();