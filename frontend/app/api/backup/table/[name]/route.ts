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
  'creditors', 'credit_sales', 'credit_sale_items', 'credit_store',
  'credit_payments', 'credit_payment_items', 'credit_activities', 'expense_categories',
];

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { name } = params;
  if (!ALLOWED_TABLES.includes(name)) {
    return NextResponse.json({ error: 'Table not in backup whitelist' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const fromIdx = parseInt(searchParams.get('from') || '0', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
  const toIdx = fromIdx + pageSize - 1;

  try {
    const { data, error, count } = await supabaseAdmin
      .from(name)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx);

    if (error) {
      // Retry without ordering if created_at doesn't exist
      const { data: data2, error: err2, count: count2 } = await supabaseAdmin
        .from(name)
        .select('*', { count: 'exact' })
        .range(fromIdx, toIdx);
      if (err2) return NextResponse.json({ error: err2.message }, { status: 400 });
      const rows2 = (data2 as Record<string, unknown>[]) ?? [];
      const columns2 = rows2.length > 0 ? Object.keys(rows2[0]) : [];
      return NextResponse.json({ rows: rows2, columns: columns2, totalRows: count2 ?? 0 });
    }

    const rows = (data as Record<string, unknown>[]) ?? [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({ rows, columns, totalRows: count ?? 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
