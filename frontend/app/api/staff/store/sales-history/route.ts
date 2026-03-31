import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  // Get all staff_sales for this staff
  const { data: sales, error } = await supabaseAdmin
    .from('staff_sales')
    .select('*, items:item_id(id, name, sku, unit_price, price_jalingo, price_outside)')
    .eq('staff_id', authResult.id)
    .order('sale_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Get staff_payments to calculate what's been paid
  const { data: payments } = await supabaseAdmin
    .from('staff_payments')
    .select('amount, status')
    .eq('staff_id', authResult.id);

  const paidAmount = (payments || [])
    .filter((p: any) => p.status === 'paid' || p.status === 'approved')
    .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);

  // Build allItems as grouped by item_id
  const groupedMap = new Map<string, any>();
  for (const sale of sales || []) {
    const key = sale.item_id;
    if (groupedMap.has(key)) {
      const existing = groupedMap.get(key);
      existing.quantity += sale.quantity;
      existing.total_amount += parseFloat(sale.total_amount) || 0;
      existing.sale_ids.push(sale.id);
    } else {
      groupedMap.set(key, {
        id: sale.id,
        item_id: sale.item_id,
        item_name: sale.items?.name || 'Unknown',
        quantity: sale.quantity,
        unit_price: parseFloat(sale.unit_price) || 0,
        price_jalingo: sale.items?.price_jalingo || parseFloat(sale.unit_price) || 0,
        total_amount: parseFloat(sale.total_amount) || 0,
        sale_date: sale.sale_date,
        sale_ids: [sale.id],
        sold_outside_jalingo: sale.sold_outside_jalingo || false,
      });
    }
  }
  const allItems = Array.from(groupedMap.values());

  // Recent sales (individual rows, most recent first)
  const recentSales = (sales || []).map((sale: any) => ({
    id: sale.id,
    item_id: sale.item_id,
    item_name: sale.items?.name || 'Unknown',
    quantity: sale.quantity,
    unit_price: parseFloat(sale.unit_price) || 0,
    total_amount: parseFloat(sale.total_amount) || 0,
    payment_method: sale.payment_method || 'cash',
    sale_date: sale.sale_date,
    receipt_number: sale.receipt_number || '',
    sold_outside_jalingo: false,
    commission: parseFloat(sale.commission) || 0,
  }));

  const totalQuantity = allItems.reduce((s, i) => s + i.quantity, 0);
  const totalSales = allItems.reduce((s, i) => s + i.total_amount, 0);
  const outstandingAmount = Math.max(0, totalSales - paidAmount);

  return NextResponse.json({
    allItems,
    recentSales,
    stats: {
      totalQuantity,
      outstandingQuantity: totalQuantity,
      totalSales,
      outstandingAmount,
    },
  });
}
