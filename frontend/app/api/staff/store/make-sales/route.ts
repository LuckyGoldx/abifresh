import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { items, payment_method, sold_outside_jalingo } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    const isCommissionStaff = ['commission_staff', 'staff_commission'].includes(authResult.role);
    const salesRecords = [];

    for (const item of items) {
      const { item_id, quantity, unit_price, logistics_fee = 0 } = item;

      if (!item_id || !quantity || quantity <= 0 || !Number.isInteger(parseFloat(quantity) * 2)) {
        return NextResponse.json({ error: 'Each item requires item_id and a valid quantity (0.5 or whole numbers only)' }, { status: 400 });
      }

      // Get staff store entry
      const { data: storeEntry, error: storeError } = await supabaseAdmin
        .from('staff_store')
        .select('id, quantity, quantity_sold')
        .eq('staff_id', authResult.id)
        .eq('item_id', item_id)
        .single();

      if (storeError || !storeEntry) {
        return NextResponse.json({ error: `Item ${item_id} not found in your store` }, { status: 404 });
      }

      // Subtract any quantities locked in pending/accepted returns
      // Only pending returns are soft-locked; accepted returns are already deducted from staff_store.quantity
      const { data: pendingReturns } = await supabaseAdmin
        .from('returned_items')
        .select('quantity')
        .eq('requester_staff_id', authResult.id)
        .eq('item_id', item_id)
        .eq('status', 'pending');

      const lockedQty = (pendingReturns || []).reduce((sum: number, r: any) => sum + (r.quantity || 0), 0);
      const quantityAvailable = (storeEntry.quantity || 0) - (storeEntry.quantity_sold || 0) - lockedQty;
      if (quantityAvailable < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${quantityAvailable}, Requested: ${quantity}` },
          { status: 400 }
        );
      }

      // Get item details for commission calculation
      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('commission, name')
        .eq('id', item_id)
        .single();

      const commissionPerUnit = isCommissionStaff ? (itemData?.commission || 0) : 0;
      const commissionEarned = commissionPerUnit * quantity;
      const totalAmount = (unit_price * quantity) + (logistics_fee * quantity);

      // Update staff_store quantity_sold
      const { error: updateError } = await supabaseAdmin
        .from('staff_store')
        .update({
          quantity_sold: (storeEntry.quantity_sold || 0) + quantity,
          last_updated: new Date().toISOString(),
        })
        .eq('id', storeEntry.id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

      // Create staff_sales record
      const { data: saleRecord, error: saleError } = await supabaseAdmin
        .from('staff_sales')
        .insert([{
          staff_id: authResult.id,
          item_id,
          quantity,
          unit_price,
          total_amount: totalAmount,
          commission: commissionEarned,
          payment_method: payment_method || 'cash',
        }])
        .select()
        .single();

      if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });
      salesRecords.push(saleRecord);
    }

    return NextResponse.json(
      { message: 'Sales recorded successfully', sales: salesRecords, count: salesRecords.length },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
