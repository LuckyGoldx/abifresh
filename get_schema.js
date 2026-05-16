const { createClient } = require('@supabase/supabase-js');

const OLD_URL = 'https://cifzlkspxjghpgxhrwkg.supabase.co';
const OLD_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnpsa3NweGpnaHBneGhyd2tnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTMzMDEzMCwiZXhwIjoyMDg0OTA2MTMwfQ.7Eg2j5-16Mr97DvRhipQ8XSq-BCkDcKiO5NRqkwfHm4';

const oldClient = createClient(OLD_URL, OLD_SERVICE_ROLE);

const ALL_TABLES = [
  'users', 'items', 'inventory_main_store', 'inventory_active_store',
  'sales', 'sales_items', 'daily_sales_summary', 'posted_items',
  'posted_items_mapping', 'staff_store', 'staff_sales', 'staff_commissions',
  'staff_payments', 'staff_expenses', 'receipts', 'receipt_items',
  'inventory_transfers', 'damage_loss_reports', 'notifications',
  'activity_logs', 'system_settings', 'restock_orders', 'restock_order_items',
  'returned_items', 'backup_history', 'pwa_downloads', 'expenses'
];

async function getTableSchema(table) {
  // Get one row to see columns
  const { data, error } = await oldClient.from(table).select('*').limit(1);
  if (error) return null;
  if (!data || data.length === 0) {
    // Table exists but empty - try to get columns from information_schema via RPC
    const { data: cols, error: e2 } = await oldClient.rpc('get_table_columns_info', { tbl: table });
    if (e2) {
      // Fallback: just return empty columns
      return { columns: [], sample: null };
    }
    return { columns: cols || [], sample: null };
  }
  const columns = Object.keys(data[0]);
  const types = {};
  for (const col of columns) {
    const val = data[0][col];
    if (val === null) types[col] = 'unknown';
    else if (typeof val === 'number') types[col] = Number.isInteger(val) ? 'integer' : 'numeric';
    else if (typeof val === 'boolean') types[col] = 'boolean';
    else if (val instanceof Date || val?.includes?.('T')) types[col] = 'timestamptz';
    else if (typeof val === 'object') types[col] = 'jsonb';
    else types[col] = 'text';
  }
  return { columns, sample: data[0], types };
}

async function main() {
  console.log('Getting actual schema from old database...\n');

  for (const table of ALL_TABLES) {
    const schema = await getTableSchema(table);
    if (!schema) {
      console.log(`❌ "${table}" — does not exist`);
      continue;
    }
    console.log(`\n📋 ${table}:`);
    console.log(`  Columns: [${schema.columns.join(', ')}]`);
    if (schema.sample) {
      console.log(`  Sample: ${JSON.stringify(schema.sample, null, 2)}`);
    }
  }
}

main().catch(console.error);
