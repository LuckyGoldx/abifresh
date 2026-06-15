import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const ALLOWED_TABLES = [
  'users', 'items', 'inventory_main_store', 'inventory_active_store',
  'inventory_transfers', 'restock_orders', 'restock_order_items',
  'sales', 'sales_items', 'daily_sales_summary', 'receipts', 'receipt_items',
  'posted_items', 'staff_store', 'posted_items_mapping', 'staff_sales',
  'staff_commissions', 'staff_payments', 'staff_expenses', 'returned_items',
  'damage_loss_reports', 'notifications', 'activity_logs', 'system_settings', 'backup_history',
  'creditors', 'credit_sales', 'credit_sale_items', 'credit_store',
  'credit_payments', 'credit_payment_items', 'credit_activities', 'expense_categories',
  'pwa_downloads',
];
const GENERATED_ALWAYS_COLUMNS: Record<string, string[]> = {
  staff_store: ['quantity_available'],
};

// Restore order: parent tables before children to respect foreign key constraints
const RESTORE_ORDER = [
  'users', 'items', 'expense_categories',
  'inventory_main_store', 'inventory_active_store', 'restock_orders',
  'restock_order_items', 'inventory_transfers', 'creditors',
  'sales', 'sales_items', 'daily_sales_summary', 'receipts', 'receipt_items',
  'staff_commissions', 'staff_expenses', 'staff_payments',
  'posted_items', 'posted_items_mapping', 'staff_store', 'staff_sales',
  'returned_items', 'damage_loss_reports',
  'credit_sales', 'credit_sale_items', 'credit_store', 'credit_payments',
  'credit_payment_items', 'credit_activities',
  'notifications', 'activity_logs', 'system_settings',
  'backup_history', 'pwa_downloads',
];

function stripColumns(rows: Record<string, unknown>[], cols: string[]): Record<string, unknown>[] {
  if (cols.length === 0) return rows;
  return rows.map((row) => { const clean = { ...row }; for (const c of cols) delete clean[c]; return clean; });
}

function parseGeneratedColumnError(msg: string): string | null {
  const m = msg.match(/cannot insert a non-DEFAULT value into column "([^"]+)"/);
  return m?.[1] ?? null;
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const modeRaw = formData.get('mode') as string || 'merge';
    const mode: 'merge' | 'replace' = modeRaw === 'replace' ? 'replace' : 'merge';
    const tablesRaw = formData.get('tables') as string || '[]';
    let selectedTables: string[] = [];
    try { selectedTables = JSON.parse(tablesRaw); } catch { return NextResponse.json({ error: 'Invalid tables parameter' }, { status: 400 }); }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const sheetPairs: { tableName: string; rows: Record<string, unknown>[] }[] = [];

    if (isCSV) {
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { raw: false }) as Record<string, unknown>[];
      const match = fileName.match(/abifresh_([a-z0-9_]+)_\d{4}-\d{2}-\d{2}/i);
      const tableName = match?.[1] ?? wb.SheetNames[0];
      if (ALLOWED_TABLES.includes(tableName)) sheetPairs.push({ tableName, rows });
    } else {
      for (const sheetName of wb.SheetNames) {
        if (!ALLOWED_TABLES.includes(sheetName)) continue;
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false }) as Record<string, unknown>[];
        sheetPairs.push({ tableName: sheetName, rows });
      }
    }

    // Process tables in RESTORE_ORDER to respect foreign key constraints
    sheetPairs.sort((a, b) => {
      const ai = RESTORE_ORDER.indexOf(a.tableName);
      const bi = RESTORE_ORDER.indexOf(b.tableName);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const results: any[] = [];

    for (const { tableName, rows } of sheetPairs) {
      if (selectedTables.length > 0 && !selectedTables.includes(tableName)) continue;
      const generatedCols = [...(GENERATED_ALWAYS_COLUMNS[tableName] ?? [])];

      try {
        if (mode === 'replace') {
          const { error: delErr } = await supabaseAdmin.from(tableName).delete().not('id', 'is', null);
          if (delErr) throw new Error(`Delete failed: ${delErr.message}`);
        }

        const BATCH = 500;
        let rowsInserted = 0;

        for (let i = 0; i < rows.length; i += BATCH) {
          let batch = stripColumns(rows.slice(i, i + BATCH), generatedCols);

          let insertError: any;
          if (mode === 'merge') {
            ({ error: insertError } = await supabaseAdmin.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: false }));
          } else {
            ({ error: insertError } = await supabaseAdmin.from(tableName).insert(batch));
          }

          if (insertError) {
            const dynCol = parseGeneratedColumnError(insertError.message ?? '');
            if (dynCol && !generatedCols.includes(dynCol)) {
              generatedCols.push(dynCol);
              batch = stripColumns(batch, [dynCol]);
              if (mode === 'merge') {
                ({ error: insertError } = await supabaseAdmin.from(tableName).upsert(batch, { onConflict: 'id', ignoreDuplicates: false }));
              } else {
                ({ error: insertError } = await supabaseAdmin.from(tableName).insert(batch));
              }
            }
            if (insertError) throw new Error(insertError.message);
          }

          rowsInserted += batch.length;
        }

        results.push({ table: tableName, rowsTotal: rows.length, rowsInserted, success: true });
      } catch (err: any) {
        results.push({ table: tableName, rowsTotal: rows.length, rowsInserted: 0, success: false, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: `Restore failed: ${err.message}` }, { status: 400 });
  }
}
