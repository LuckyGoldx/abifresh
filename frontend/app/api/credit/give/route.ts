import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { creditor_id, items, notes } = await req.json();

    if (!creditor_id) return NextResponse.json({ error: 'Creditor is required' }, { status: 400 });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    const { data: creditor, error: creditorError } = await supabaseAdmin.from('creditors').select('*').eq('id', creditor_id).single();
    if (creditorError || !creditor) return NextResponse.json({ error: 'Creditor not found' }, { status: 404 });

    const receiptNumber = `CR-${Date.now()}`;
    let totalAmount = 0;
    let totalQuantity = 0;

    const saleItems = [];
    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const { data: dbItem } = await supabaseAdmin.from('items').select('*').eq('id', item.item_id).single();
      if (!dbItem) continue;

      const unitPrice = Number(item.unit_price) || Number(dbItem.unit_price) || 0;
      const totalPrice = qty * unitPrice;
      totalAmount += totalPrice;
      totalQuantity += qty;

      saleItems.push({
        item_id: item.item_id,
        item_name: dbItem.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
      });
    }

    if (saleItems.length === 0) return NextResponse.json({ error: 'No valid items to process' }, { status: 400 });

    const { data: creditSale, error: saleError } = await supabaseAdmin.from('credit_sales').insert({
      creditor_id,
      staff_id: authResult.id,
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      total_quantity: totalQuantity,
      notes: notes || null,
    }).select().single();

    if (saleError) return NextResponse.json({ error: saleError.message }, { status: 400 });

    const creditStoreEntries = [];
    for (const si of saleItems) {
      const { data: csi, error: csiError } = await supabaseAdmin.from('credit_sale_items').insert({
        credit_sale_id: creditSale.id,
        item_id: si.item_id,
        item_name: si.item_name,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total_price: si.total_price,
      }).select().single();

      if (csiError) return NextResponse.json({ error: csiError.message }, { status: 400 });

      creditStoreEntries.push({
        credit_sale_id: creditSale.id,
        credit_sale_item_id: csi.id,
        creditor_id,
        item_id: si.item_id,
        item_name: si.item_name,
        quantity: si.quantity,
        unit_price: si.unit_price,
        status: 'active',
      });

      const { data: currentItem } = await supabaseAdmin.from('items').select('active_store_quantity').eq('id', si.item_id).single();
      const newQty = Math.max(0, (currentItem?.active_store_quantity || 0) - si.quantity);
      await supabaseAdmin.from('items').update({ active_store_quantity: newQty }).eq('id', si.item_id);
    }

    const { error: storeError } = await supabaseAdmin.from('credit_store').insert(creditStoreEntries);
    if (storeError) return NextResponse.json({ error: storeError.message }, { status: 400 });

    await supabaseAdmin.from('credit_activities').insert({
      creditor_id,
      credit_sale_id: creditSale.id,
      staff_id: authResult.id,
      action: 'CREDIT_GIVEN',
      details: { receipt_number: receiptNumber, total_amount: totalAmount, items: saleItems },
    });

    return NextResponse.json({
      credit_sale_id: creditSale.id,
      receipt_number: receiptNumber,
      total_amount: totalAmount,
      items: saleItems,
      creditor: { name: creditor.full_name, phone: creditor.phone_number, address: creditor.address },
      message: 'Credit given successfully',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
