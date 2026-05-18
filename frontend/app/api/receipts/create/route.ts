import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const { receipt_number, items, total_amount, payment_method, sold_outside_jalingo } = body;

  if (!receipt_number || !items || !total_amount || !payment_method) {
    return NextResponse.json({ error: 'receipt_number, items, total_amount, and payment_method are required' }, { status: 400 });
  }

  const validReceiptPaymentMethods = ['cash', 'pos', 'transfer'];
  if (!validReceiptPaymentMethods.includes(payment_method)) {
    return NextResponse.json({ error: 'Invalid payment_method. Must be cash, pos, or transfer' }, { status: 400 });
  }

  // Create main receipt record
  const { data: receipt, error: receiptError } = await supabaseAdmin
    .from('receipts')
    .insert({
      receipt_number,
      staff_id: authResult.id,
      total_amount,
      payment_method,
      sold_outside_jalingo: sold_outside_jalingo || false,
    })
    .select()
    .single();

  if (receiptError || !receipt) {
    return NextResponse.json({ error: receiptError?.message || 'Failed to create receipt' }, { status: 400 });
  }

  // Create receipt items
  const itemIds = items.map((i: any) => i.item_id).filter(Boolean);
  const { data: dbItems } = itemIds.length > 0 
     ? await supabaseAdmin.from('items').select('id, name, unit_price').in('id', itemIds)
     : { data: [] };

  const dbItemsMap = new Map<string, { name: string; unit_price: number }>();
  (dbItems || []).forEach((i: any) => dbItemsMap.set(i.id, { name: i.name, unit_price: i.unit_price || 0 }));

  const itemsToInsert = (items as any[]).map((item: any) => {
    const dbItem = dbItemsMap.get(item.item_id);
    const itemName = item.item_name || item.name || dbItem?.name || 'Unknown';
    const costPrice = dbItem?.unit_price || 0;
    return {
      receipt_id: receipt.id,
      item_id: item.item_id,
      item_name: itemName,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      cost_price: costPrice,
    };
  });

  // Try inserting with item_name; if column missing (schema cache issue), retry without it
  let itemsError = (await supabaseAdmin.from('receipt_items').insert(itemsToInsert)).error;
  if (itemsError?.message?.includes('item_name')) {
    const fallback = itemsToInsert.map(({ item_name, ...rest }: any) => rest);
    const { error: retryError } = await supabaseAdmin.from('receipt_items').insert(fallback);
    itemsError = retryError ?? null;
  }
  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

  // Update daily_sales_summary
  const today = new Date(receipt.created_at || new Date()).toISOString().split('T')[0];
  const { data: existing } = await supabaseAdmin
    .from('daily_sales_summary')
    .select('id, total_items_sold, total_revenue, number_of_transactions')
    .eq('salesperson_id', authResult.id)
    .eq('sale_date', today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from('daily_sales_summary')
      .update({
        total_items_sold: (existing.total_items_sold || 0) + items.length,
        total_revenue: (existing.total_revenue || 0) + total_amount,
        number_of_transactions: (existing.number_of_transactions || 0) + 1,
      })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin.from('daily_sales_summary').insert({
      salesperson_id: authResult.id,
      sale_date: today,
      total_items_sold: items.length,
      total_revenue: total_amount,
      number_of_transactions: 1,
    });
  }

  return NextResponse.json(receipt, { status: 201 });
}
