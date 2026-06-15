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
  'pwa_downloads',
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

  try {
    const allRows: Record<string, unknown>[] = [];
    const PAGE = 1000;
    let from = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.from(name).select('*').range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allRows.push(...(data as Record<string, unknown>[]));
      if (data.length < PAGE) break;
      from += PAGE;
    }

    return NextResponse.json({ rows: allRows, totalRows: allRows.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
