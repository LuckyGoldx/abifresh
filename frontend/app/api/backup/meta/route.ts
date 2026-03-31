import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const ALLOWED_TABLES = [
  'users', 'items', 'inventory_main_store', 'inventory_active_store',
  'inventory_transfers', 'restock_orders', 'restock_order_items',
  'sales', 'sales_items', 'daily_sales_summary', 'receipts', 'receipt_items',
  'posted_items', 'staff_store', 'posted_items_mapping', 'staff_sales',
  'staff_commissions', 'staff_payments', 'staff_expenses', 'returned_items',
  'damage_loss_reports', 'notifications', 'activity_logs', 'system_settings', 'backup_history',
];

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const results = await Promise.all(
    ALLOWED_TABLES.map(async (tableName) => {
      try {
        const { data, error, count } = await supabaseAdmin
          .from(tableName)
          .select('*', { count: 'exact' })
          .limit(1);

        if (error) {
          return { name: tableName, rowCount: null, columnCount: null, columns: [], hasError: true, errorMessage: error.message };
        }

        const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
        return { name: tableName, rowCount: count ?? 0, columnCount: columns.length, columns, hasError: false };
      } catch (err: any) {
        return { name: tableName, rowCount: null, columnCount: null, columns: [], hasError: true, errorMessage: err?.message || 'Unknown error' };
      }
    })
  );

  return NextResponse.json({ tables: results });
}
