const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

const ALL_TABLES = [
  "users", "items", "inventory_main_store", "inventory_active_store",
  "sales", "sales_items", "daily_sales_summary", "posted_items",
  "posted_items_mapping", "staff_store", "staff_sales", "staff_commissions",
  "staff_payments", "staff_expenses", "receipts", "receipt_items",
  "inventory_transfers", "damage_loss_reports", "notifications",
  "activity_logs", "system_settings", "restock_orders", "restock_order_items",
  "returned_items", "backup_history", "pwa_downloads", "expenses"
];

async function getTableSchema(table) {
  const { data, error } = await client.from(table).select("*").limit(1);
  if (error) return null;
  if (!data || data.length === 0) {
    const { data: cols, error: e2 } = await client.rpc("get_table_columns_info", { tbl: table });
    if (e2) {
      return { columns: [], sample: null };
    }
    return { columns: cols || [], sample: null };
  }
  const columns = Object.keys(data[0]);
  const types = {};
  for (const col of columns) {
    const val = data[0][col];
    if (val === null) types[col] = "unknown";
    else if (typeof val === "number") types[col] = Number.isInteger(val) ? "integer" : "numeric";
    else if (typeof val === "boolean") types[col] = "boolean";
    else if (val instanceof Date || val && val.includes && val.includes("T")) types[col] = "timestamptz";
    else if (typeof val === "object") types[col] = "jsonb";
    else types[col] = "text";
  }
  return { columns, sample: data[0], types };
}

async function main() {
  console.log("Getting actual schema from database...\n");

  for (const table of ALL_TABLES) {
    const schema = await getTableSchema(table);
    if (!schema) {
      console.log("  \"" + table + "\" - does not exist");
      continue;
    }
    console.log("\n  " + table + ":");
    console.log("  Columns: [" + schema.columns.join(", ") + "]");
    if (schema.sample) {
      console.log("  Sample: " + JSON.stringify(schema.sample, null, 2));
    }
  }
}

main().catch(console.error);