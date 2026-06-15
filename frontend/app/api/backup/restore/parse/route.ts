import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifyAuth, hasRole } from '@/lib/server/auth';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const isCSV = fileName.toLowerCase().endsWith('.csv');

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheets: any[] = [];

    if (isCSV) {
      const sheetName = wb.SheetNames[0] ?? 'Sheet1';
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { raw: false }) as Record<string, unknown>[];
      const match = fileName.match(/abifresh_([a-z0-9_]+)_\d{4}-\d{2}-\d{2}/i);
      const tableName = match?.[1] ?? sheetName;
      sheets.push({ sheetName, tableName, matched: ALLOWED_TABLES.includes(tableName), rowCount: rows.length, columns: rows.length ? Object.keys(rows[0]) : [] });
    } else {
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { raw: false }) as Record<string, unknown>[];
        sheets.push({ sheetName, tableName: sheetName, matched: ALLOWED_TABLES.includes(sheetName), rowCount: rows.length, columns: rows.length ? Object.keys(rows[0]) : [] });
      }
    }

    return NextResponse.json({ sheets, fileName });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse file: ${err.message}` }, { status: 400 });
  }
}
