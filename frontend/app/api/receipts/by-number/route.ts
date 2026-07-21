import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const receiptNumber = searchParams.get('receipt_number');

  if (!receiptNumber) {
    return NextResponse.json({ error: 'receipt_number is required' }, { status: 400 });
  }

  // Try staff_sales first (commission staff)
  const { data: staffData } = await supabaseAdmin
    .from('staff_sales')
    .select('id, item_id, quantity, unit_price, total_amount, commission, approved_commission, sale_date, created_at, items:item_id(id, name)')
    .eq('receipt_number', receiptNumber)
    .order('created_at', { ascending: true });

  if (staffData && staffData.length > 0) {
    const items = staffData.map((s: any) => ({
      ...s,
      item_name: s.items?.name || 'Unknown',
    }));
    const totalAmount = items.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
    return NextResponse.json({
      receipt_number: receiptNumber,
      items,
      total_amount: totalAmount,
      item_count: items.length,
    });
  }

  // Fallback to sales table (front-desk sales)
  const { data: salesRows } = await supabaseAdmin
    .from('sales')
    .select('id, receipt_number, total_amount, payment_method, sale_date, created_at, sales_items(*, items(name)), users!staff_id(full_name)')
    .eq('receipt_number', receiptNumber)
    .limit(1);

  const salesRow = salesRows && salesRows.length > 0 ? salesRows[0] : null;

  if (salesRow) {
    const items = (salesRow.sales_items || []).map((si: any) => ({
      id: si.id,
      item_id: si.item_id,
      quantity: si.quantity,
      unit_price: si.unit_price,
      total_amount: (si.quantity || 0) * (si.unit_price || 0),
      item_name: si.items?.name || 'Unknown',
    }));
    return NextResponse.json({
      receipt_number: receiptNumber,
      items,
      total_amount: salesRow.total_amount || items.reduce((s: number, i: any) => s + i.total_amount, 0),
      item_count: items.length,
    });
  }

  return NextResponse.json({
    receipt_number: receiptNumber,
    items: [],
    total_amount: 0,
    item_count: 0,
  });
}
