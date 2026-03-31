import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { items, total_amount, payment_method, sold_outside_jalingo } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Create sale record
    const { data: saleData, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          staff_id: authResult.id,
          receipt_number: `REC-${Date.now()}`,
          total_amount,
          payment_method,
          sold_outside_jalingo,
        },
      ])
      .select()
      .single();

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    // Create sales_items records and reduce active_store_quantity
    for (const item of items) {
      const { error: itemError } = await supabaseAdmin.from('sales_items').insert([
        {
          sale_id: saleData.id,
          item_id: item.item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          logistics_fee: item.logistics_fee || 0,
        },
      ]);
      if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 });

      // Reduce active_store_quantity
      const { data: currentItem } = await supabaseAdmin
        .from('items')
        .select('active_store_quantity')
        .eq('id', item.item_id)
        .single();

      const newQty = Math.max(0, (currentItem?.active_store_quantity || 0) - item.quantity);
      await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newQty })
        .eq('id', item.item_id);
    }

    // Update daily sales summary
    const saleDate = new Date().toISOString().split('T')[0];
    const itemsCount = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
    const { data: existingDSS } = await supabaseAdmin
      .from('daily_sales_summary')
      .select('id, total_items_sold, total_revenue, number_of_transactions')
      .eq('salesperson_id', authResult.id)
      .eq('sale_date', saleDate)
      .single();

    if (existingDSS) {
      await supabaseAdmin
        .from('daily_sales_summary')
        .update({
          total_items_sold: (existingDSS.total_items_sold || 0) + itemsCount,
          total_revenue: (existingDSS.total_revenue || 0) + total_amount,
          number_of_transactions: (existingDSS.number_of_transactions || 0) + 1,
        })
        .eq('id', existingDSS.id);
    } else {
      await supabaseAdmin.from('daily_sales_summary').insert({
        salesperson_id: authResult.id,
        sale_date: saleDate,
        total_items_sold: itemsCount,
        total_revenue: total_amount,
        number_of_transactions: 1,
      });
    }

    return NextResponse.json(
      { sale_id: saleData.id, receipt_number: saleData.receipt_number, message: 'Sale completed successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
