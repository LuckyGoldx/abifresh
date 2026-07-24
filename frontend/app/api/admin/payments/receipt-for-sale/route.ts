import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const saleIdsParam = searchParams.get('saleIds');

  if (!saleIdsParam) {
    return NextResponse.json({ error: 'saleIds is required' }, { status: 400 });
  }

  const saleIds = saleIdsParam.split(',').filter(Boolean);

  // Get receipt_number from staff_sales
  const { data: staffSales } = await supabaseAdmin
    .from('staff_sales')
    .select('receipt_number')
    .in('id', saleIds);

  if (!staffSales || staffSales.length === 0) {
    return NextResponse.json({ receipt_number: null, items: [], total_amount: 0, item_count: 0 });
  }

  const receiptNumber = staffSales.find(s => s.receipt_number)?.receipt_number;
  if (!receiptNumber) {
    return NextResponse.json({ receipt_number: null, items: [], total_amount: 0, item_count: 0 });
  }

  // Fetch receipt items from staff_sales by receipt_number (same logic as /api/receipts/by-number)
  const { data: receiptData } = await supabaseAdmin
    .from('staff_sales')
    .select('id, item_id, quantity, unit_price, total_amount, items:item_id(id, name)')
    .eq('receipt_number', receiptNumber)
    .order('created_at', { ascending: true });

  if (!receiptData || receiptData.length === 0) {
    return NextResponse.json({ receipt_number: receiptNumber, items: [], total_amount: 0, item_count: 0 });
  }

  const items = receiptData.map((s: any) => ({
    id: s.id,
    item_id: s.item_id,
    quantity: s.quantity,
    unit_price: s.unit_price,
    total_price: s.total_amount,
    item_name: s.items?.name || 'Unknown',
  }));

  const totalAmount = items.reduce((sum: number, i: any) => sum + (i.total_price || 0), 0);

  return NextResponse.json({
    receipt_number: receiptNumber,
    items,
    total_amount: totalAmount,
    item_count: items.length,
  });
}
