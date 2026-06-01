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

    // Batch-fetch all items in one query instead of N individual queries
    const itemIds = items.map((i: any) => i.item_id).filter(Boolean);
    const { data: dbItems } = itemIds.length > 0
      ? await supabaseAdmin.from('items').select('id, name, unit_price, active_store_quantity').in('id', itemIds)
      : { data: [] };

    const dbItemsMap = new Map<string, any>();
    (dbItems || []).forEach((i: any) => dbItemsMap.set(i.id, i));

    let totalAmount = 0;
    let totalQuantity = 0;
    const saleItems: Array<{
      item_id: string; item_name: string; quantity: number;
      unit_price: number; total_price: number;
    }> = [];
    const quantityDeltas: Array<{ item_id: string; quantity: number }> = [];

    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) continue;

      const dbItem = dbItemsMap.get(item.item_id);
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

      quantityDeltas.push({ item_id: item.item_id, quantity: qty });
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

    // Batch insert all credit_sale_items in one query
    const creditSaleItemsData = saleItems.map((si) => ({
      credit_sale_id: creditSale.id,
      item_id: si.item_id,
      item_name: si.item_name,
      quantity: si.quantity,
      unit_price: si.unit_price,
      total_price: si.total_price,
    }));

    const { data: insertedItems, error: bulkInsertError } = await supabaseAdmin
      .from('credit_sale_items')
      .insert(creditSaleItemsData)
      .select('id, item_id, item_name, quantity, unit_price, total_price');

    if (bulkInsertError) return NextResponse.json({ error: bulkInsertError.message }, { status: 400 });

    // Batch update active_store_quantity for all items in parallel
    const creditStoreEntries = (insertedItems || []).map((csi: any) => ({
      credit_sale_id: creditSale.id,
      credit_sale_item_id: csi.id,
      creditor_id,
      item_id: csi.item_id,
      item_name: csi.item_name,
      quantity: csi.quantity,
      unit_price: csi.unit_price,
      status: 'active',
    }));

    await Promise.all(
      quantityDeltas.map((delta) => {
        const currentQty = dbItemsMap.get(delta.item_id)?.active_store_quantity || 0;
        const newQty = Math.max(0, currentQty - delta.quantity);
        return supabaseAdmin
          .from('items')
          .update({ active_store_quantity: newQty })
          .eq('id', delta.item_id);
      })
    );

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
