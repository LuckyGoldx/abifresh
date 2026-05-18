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
    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const sales = [];
    const receiptNumber = `REC-${Date.now()}`;
    const totalAmount = items.reduce((sum: number, i: any) => {
      return sum + ((i.unit_price || 0) * (i.sale_quantity || 1));
    }, 0);

    // Create parent sale record
    const { data: saleData, error: saleError } = await supabaseAdmin
      .from('sales')
      .insert([
        {
          staff_id: authResult.id,
          receipt_number: receiptNumber,
          total_amount: totalAmount,
          payment_method: 'cash',
          sold_outside_jalingo: false,
        },
      ])
      .select()
      .single();

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    for (const item of items) {
      const { data: dbItem } = await supabaseAdmin
        .from('items')
        .select('unit_price, active_store_quantity')
        .eq('id', item.id)
        .single();

      const unitPrice = dbItem?.unit_price || 0;

      // Insert sales_items child record
      const { error: siError } = await supabaseAdmin.from('sales_items').insert([
        {
          sale_id: saleData.id,
          item_id: item.id,
          quantity: item.sale_quantity || 1,
          unit_price: item.unit_price || unitPrice,
          cost_price: unitPrice,
        },
      ]);

      if (siError) return NextResponse.json({ error: siError.message }, { status: 400 });

      // Reduce inventory
      const newQty = Math.max(0, (dbItem?.active_store_quantity || 0) - (item.sale_quantity || 1));
      await supabaseAdmin
        .from('items')
        .update({ active_store_quantity: newQty })
        .eq('id', item.id);

      sales.push({ sale_id: saleData.id, item_id: item.id, quantity: item.sale_quantity || 1 });
    }

    return NextResponse.json({ sales, message: 'Sales completed successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
