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
    const { item_id, quantity, payment_method, buyer_type, store_location } =
      await req.json();

    if (!item_id || !quantity || !payment_method) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get item details
    const { data: item, error: itemError } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('id', item_id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const unitPrice = item.unit_price || 0;
    const totalAmount = unitPrice * quantity;
    const receiptNumber = `REC-${Date.now()}`;

    // Create sale record (parent)
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          staff_id: authResult.id,
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          payment_method,
          sold_outside_jalingo: (store_location && store_location !== 'Jalingo') || false,
        },
      ])
      .select()
      .single();

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    // Create sales_items record (child)
    const { error: siError } = await supabaseAdmin.from('sales_items').insert([
      {
        sale_id: sale.id,
        item_id,
        quantity,
        unit_price: unitPrice,
      },
    ]);

    if (siError) return NextResponse.json({ error: siError.message }, { status: 400 });

    // Deduct from active store inventory
    const newQty = Math.max(0, (item.active_store_quantity || 0) - quantity);
    await supabaseAdmin.from('items').update({ active_store_quantity: newQty }).eq('id', item_id);

    // Update daily sales summary
    const saleDate = new Date().toISOString().split('T')[0];
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
          total_items_sold: (existingDSS.total_items_sold || 0) + quantity,
          total_revenue: (existingDSS.total_revenue || 0) + totalAmount,
          number_of_transactions: (existingDSS.number_of_transactions || 0) + 1,
        })
        .eq('id', existingDSS.id);
    } else {
      await supabaseAdmin.from('daily_sales_summary').insert({
        salesperson_id: authResult.id,
        sale_date: saleDate,
        total_items_sold: quantity,
        total_revenue: totalAmount,
        number_of_transactions: 1,
      });
    }

    return NextResponse.json({ sale, message: 'Sale recorded successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
