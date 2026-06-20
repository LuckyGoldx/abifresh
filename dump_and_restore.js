const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");

const OLD_URL = process.env.OLD_SUPABASE_URL || "";
const OLD_SERVICE_ROLE = process.env.OLD_SUPABASE_SERVICE_ROLE_KEY || "";

if (!OLD_URL || !OLD_SERVICE_ROLE) {
  console.error("Missing OLD_SUPABASE_URL or OLD_SUPABASE_SERVICE_ROLE_KEY environment variables");
  console.error("   Example:");
  console.error("   $env:OLD_SUPABASE_URL=\"https://xxxx.supabase.co\"");
  console.error("   $env:OLD_SUPABASE_SERVICE_ROLE_KEY=\"eyJ...\"");
  process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_SERVICE_ROLE);
const oldProjectId = new URL(OLD_URL).hostname.split(".")[0];
const targetUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const targetProjectId = new URL(targetUrl).hostname.split(".")[0];

const ALL_TABLES = [
  "users",
  "items",
  "inventory_main_store",
  "inventory_active_store",
  "sales",
  "sales_items",
  "daily_sales_summary",
  "posted_items",
  "posted_items_mapping",
  "staff_store",
  "staff_sales",
  "staff_commissions",
  "staff_payments",
  "staff_expenses",
  "receipts",
  "receipt_items",
  "inventory_transfers",
  "damage_loss_reports",
  "notifications",
  "activity_logs",
  "system_settings",
  "restock_orders",
  "restock_order_items",
  "returned_items",
  "backup_history",
  "pwa_downloads",
  "expenses"
];

const GENERATED_COLUMNS = {
  "staff_store": ["quantity_available"]
};

function escapeSQL(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return val.toString();
  if (val instanceof Date) return "'" + val.toISOString() + "'";
  if (typeof val === "object") {
    const str = JSON.stringify(val);
    return "'" + str.replace(/'/g, "''") + "'::jsonb";
  }
  return "'" + String(val).replace(/'/g, "''") + "'";
}

async function tableExists(table) {
  const { error } = await oldClient
    .from(table)
    .select("id", { count: "exact", head: true });
  return !error;
}

async function dumpTable(table) {
  const exists = await tableExists(table);
  if (!exists) {
    console.log("  " + table + " - does not exist");
    return null;
  }

  let allData = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await oldClient
      .from(table)
      .select("*")
      .range(from, to)
      .order("id", { ascending: true, nullsFirst: false });

    if (error) {
      const { data: d2, error: e2 } = await oldClient
        .from(table)
        .select("*")
        .range(from, to);

      if (e2 || !d2 || d2.length === 0) break;
      allData = allData.concat(d2);
      if (d2.length < pageSize) break;
    } else {
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
    }
    page++;
  }

  const columns = allData.length > 0 ? Object.keys(allData[0]) : [];
  console.log("  \" + table + \": \" + allData.length + \" rows, columns: [\" + columns.join(\", \") + \"]");
  return { rows: allData, columns };
}

function generateInsertSQL(table, rows, columns) {
  if (!rows || rows.length === 0) return "";

  const excluded = GENERATED_COLUMNS[table] || [];
  const filteredCols = columns.filter(c => !excluded.includes(c));

  if (filteredCols.length === 0) return "";

  const colList = filteredCols.map(c => "\"" + c + "\"").join(", ");
  const chunkSize = 100;
  const chunks = [];

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const parts = chunk.map(row => {
      const vals = filteredCols.map(c => escapeSQL(row[c])).join(", ");
      return "(" + vals + ")";
    });

    const hasId = filteredCols.includes("id");
    if (hasId) {
      const updateCols = filteredCols.filter(c => c !== "id").map(c => "\"" + c + "\" = EXCLUDED.\"" + c + "\"").join(",\n          ");
      chunks.push("INSERT INTO public.\"" + table + "\" (" + colList + ")\nVALUES\n" + parts.join(",\n") + "\nON CONFLICT (\"id\") DO UPDATE SET\n  " + updateCols + ";");
    } else {
      chunks.push("INSERT INTO public.\"" + table + "\" (" + colList + ")\nVALUES\n" + parts.join(",\n") + ";");
    }
  }
  return chunks.join("\n\n");
}

async function main() {
  console.log("===========================================================");
  console.log("  AKV DATABASE DUMP");
  console.log("  Source: " + oldProjectId);
  console.log("  Target: " + targetProjectId);
  console.log("===========================================================\n");

  const results = {};

  for (const table of ALL_TABLES) {
    console.log("\nProcessing: " + table);
    const result = await dumpTable(table);
    if (result) results[table] = result;
  }

  console.log("\n===========================================================");
  console.log("  GENERATING SQL FILE");
  console.log("===========================================================\n");

  let sql = "-- ============================================================================\n";
  sql += "-- AKV COMPLETE DATABASE DUMP\n";
  sql += "-- Generated: " + new Date().toISOString() + "\n";
  sql += "-- Source: " + oldProjectId + "\n";
  sql += "-- Target: " + targetProjectId + "\n";
  sql += "-- ============================================================================\n\n";
  sql += "-- Run this in the NEW project's Supabase SQL Editor\n";
  sql += "-- ============================================================================\n\n";
  sql += "SET session_replication_role = 'replica';\n\n";

  let totalRows = 0;
  for (const [table, { rows, columns }] of Object.entries(results)) {
    const insertSQL = generateInsertSQL(table, rows, columns);
    if (insertSQL) {
      sql += "-- ============================================================================\n";
      sql += "-- TABLE: " + table + " (" + rows.length + " rows)\n";
      sql += "-- ============================================================================\n\n";
      sql += insertSQL;
      sql += "\n\n";
      totalRows += rows.length;
    }
  }

  sql += "SET session_replication_role = 'origin';\n\n";
  sql += "-- ============================================================================\n";
  sql += "-- REFRESH SCHEMA CACHE\n";
  sql += "-- ============================================================================\n\n";
  sql += "NOTIFY pgrst, 'reload schema';\n\n";
  sql += "-- ============================================================================\n";
  sql += "-- DUMP COMPLETE - " + totalRows + " total rows\n";
  sql += "-- ============================================================================\n";

  const outPath = process.env.OUTPUT_PATH || "COMPLETE_DATABASE_DUMP.sql";
  fs.writeFileSync(outPath, sql, "utf8");

  const sizeMB = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);

  console.log("\n  SQL file: " + outPath);
  console.log("  Size: " + sizeMB + " MB");
  console.log("  Total rows: " + totalRows);
  console.log("  Tables: " + Object.keys(results).length);

  console.log("\n===========================================================");
  console.log("  SUMMARY");
  console.log("===========================================================\n");
  for (const [table, { rows }] of Object.entries(results)) {
    console.log("  " + table + " ".repeat(25 - table.length) + String(rows.length).padStart(6) + " rows");
  }
  console.log("  " + "-".repeat(35));
  console.log("  " + "TOTAL" + " ".repeat(21) + String(totalRows).padStart(6) + " rows");

  console.log("\n  Dump complete!");
  console.log("\n  NEXT STEPS:");
  console.log("   1. Open " + targetUrl.replace("https://", "https://"));
  console.log("   2. Go to SQL Editor");
  console.log("   3. Copy the contents of " + outPath);
  console.log("   4. Paste and run it");
  console.log("   5. Done!");
}

main().catch(console.error);