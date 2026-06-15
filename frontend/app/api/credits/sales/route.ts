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
    const body = await req.json();
    const creditor_id = body.creditor_id || body.creditorId;
    const items = body.items;
    const notes = body.notes;

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

      const itemId = item.item_id || item.itemId;
      const { data: dbItem } = await supabaseAdmin.from('items').select('*').eq('id', itemId).single();
      if (!dbItem) continue;

      const unitPrice = Number(item.unit_price || item.unitPrice) || Number(dbItem.price_jalingo) || 0;
      const costPrice = Number(item.cost_price || item.costPrice) || Number(dbItem.unit_price) || 0;
      const totalPrice = qty * unitPrice;
      totalAmount += totalPrice;
      totalQuantity += qty;

      saleItems.push({
        item_id: itemId,
        item_name: dbItem.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        cost_price: costPrice,
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
        cost_price: si.cost_price,
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
    }

    const { error: storeError } = await supabaseAdmin.from('credit_store').insert(creditStoreEntries);
    if (storeError) {
      await supabaseAdmin.from('credit_sale_items').delete().eq('credit_sale_id', creditSale.id);
      await supabaseAdmin.from('credit_sales').delete().eq('id', creditSale.id);
      return NextResponse.json({ error: storeError.message }, { status: 400 });
    }

    for (const si of saleItems) {
      const { data: currentItem } = await supabaseAdmin.from('items').select('active_store_quantity').eq('id', si.item_id).single();
      const newQty = Math.max(0, (currentItem?.active_store_quantity || 0) - si.quantity);
      const { error: updateError } = await supabaseAdmin.from('items').update({ active_store_quantity: newQty }).eq('id', si.item_id);
      if (updateError) {
        console.error('Failed to update item quantity:', updateError);
      }
    }

    supabaseAdmin.from('credit_activities').insert({
      creditor_id,
      credit_sale_id: creditSale.id,
      staff_id: authResult.id,
      action: 'CREDIT_GIVEN',
      details: { receipt_number: receiptNumber, total_amount: totalAmount, items: saleItems },
    }).then(() => {}, () => {});

    // SEND NOTIFICATIONS
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      const notificationBatch: any[] = [];
      const staffName = authResult.full_name || 'A staff member';
      
      // Notify admins and superadmins
      if (admins) {
        admins.forEach(admin => {
          notificationBatch.push({
            user_id: admin.id,
            type: 'credit_given',
            title: '💳 New Credit Issued',
            message: `${staffName} issued credit to ${creditor.full_name} (${receiptNumber}) for ₦${totalAmount.toLocaleString()}.`,
            is_read: false
          });
        });
      }

      // Notify the staff member
      notificationBatch.push({
        user_id: authResult.id,
        type: 'credit_given_confirmation',
        title: '✅ Credit Recorded',
        message: `You have successfully recorded a credit sale of ₦${totalAmount.toLocaleString()} to ${creditor.full_name}.`,
        is_read: false,
        action_url: `/sales/credits`
      });

      if (notificationBatch.length > 0) {
        const { error: nError } = await supabaseAdmin.from('notifications').insert(notificationBatch);
        if (nError) console.error('Credit notification error:', nError);
      }
    } catch (nError) {
      console.error('Notification processing error:', nError);
    }

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

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

    // 1. Fetch all sales with relations
    let query = supabaseAdmin
      .from('credit_sales')
      .select(`
        *,
        users (full_name),
        creditors (*),
         credit_sale_items (*, item:item_id(price_jalingo)),
        credit_store (*),
        payments:credit_payments (*)
      `);
    
    if (isSalesStaff) {
      query = query.eq('staff_id', authResult.id);
    }

    const { data: sales, error: salesError } = await query.order('created_at', { ascending: false });

    if (salesError) throw salesError;
    if (!sales) return NextResponse.json([]);

    // 2. Fetch all sales and approved payments to calculate REAL-TIME outstanding balances efficiently
    let allSalesQuery = supabaseAdmin.from('credit_sales').select('id, creditor_id, total_amount').neq('status', 'cancelled');
    let allPaymentsQuery = supabaseAdmin.from('credit_payments').select('id, creditor_id, amount, credit_sale_id').eq('status', 'approved');

    if (isSalesStaff) {
      allSalesQuery = allSalesQuery.eq('staff_id', authResult.id);
      allPaymentsQuery = allPaymentsQuery.eq('staff_id', authResult.id);
    }

    const [{ data: allSales }, { data: allPayments }] = await Promise.all([
      allSalesQuery,
      allPaymentsQuery
    ]);

    // 3. Create optimized maps for lightning-fast lookup
    const salesByCreditor: Record<string, any[]> = {};
    allSales?.forEach(s => {
      if (!salesByCreditor[s.creditor_id]) salesByCreditor[s.creditor_id] = [];
      salesByCreditor[s.creditor_id].push(s);
    });

    const paymentsBySale: Record<string, number> = {};
    allPayments?.forEach(p => {
      if (p.credit_sale_id) {
        paymentsBySale[p.credit_sale_id] = (paymentsBySale[p.credit_sale_id] || 0) + Number(p.amount);
      }
    });

    // 3b. Fetch credit_payment_items to enrich per-item paid amounts
    const allItemIds = (sales || []).flatMap(s => (s.credit_sale_items || []).map((i: any) => i.id));
    const approvedPaymentIds = (allPayments || []).map(p => p.id);
    let itemPaymentsMap: Record<string, number> = {};
    if (allItemIds.length > 0 && approvedPaymentIds.length > 0) {
      const { data: allPaymentItems } = await supabaseAdmin
        .from('credit_payment_items')
        .select('credit_sale_item_id, amount')
        .in('credit_sale_item_id', allItemIds)
        .in('credit_payment_id', approvedPaymentIds);
      
      (allPaymentItems || []).forEach((pi: any) => {
        const key = pi.credit_sale_item_id;
        itemPaymentsMap[key] = (itemPaymentsMap[key] || 0) + Number(pi.amount);
      });
    }

    // 4. Map the calculated outstanding balance to each sale
    const enhancedSales = sales.map(sale => {
      if (!sale.creditors) return sale;

      const creditorId = sale.creditor_id;
      const creditorSales = salesByCreditor[creditorId] || [];

      let totalOutstandingForCreditor = 0;
      creditorSales.forEach(s => {
        const amountPaid = paymentsBySale[s.id] || 0;
        totalOutstandingForCreditor += Math.max(0, Number(s.total_amount) - amountPaid);
      });
      
      return {
        ...sale,
        credit_sale_items: (sale.credit_sale_items || []).map((item: any) => {
          const paidAmount = itemPaymentsMap[item.id] || 0;
          const sellingPrice = item.item?.price_jalingo || item.unit_price;
          const effectiveTotal = Number(item.quantity) * sellingPrice;
          return {
            ...item,
            paid_amount: paidAmount,
            remaining_amount: Math.max(0, Math.round(effectiveTotal - paidAmount))
          };
        }),
        creditors: {
          ...sale.creditors,
          outstanding: totalOutstandingForCreditor
        }
      };
    });

    return NextResponse.json(enhancedSales);
  } catch (error: any) {
    console.error('Error fetching credit sales:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

