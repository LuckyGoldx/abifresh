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
    const formData = await req.formData();
    const creditorId = formData.get('creditorId') as string;
    const creditSaleId = formData.get('creditSaleId') as string;
    const amount = formData.get('amount') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const selectedItemsRaw = formData.get('selectedItems') as string;
    const referenceNumber = formData.get('referenceNumber') as string;
    const notes = formData.get('notes') as string;

    if (!creditorId || !creditSaleId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 });
    }

    const { data: creditor } = await supabaseAdmin.from('creditors').select('outstanding').eq('id', creditorId).single();
    if (creditor && Number(amount) > Number(creditor.outstanding)) {
      return NextResponse.json({ 
        error: `Payment exceeds total outstanding balance (₦${Number(creditor.outstanding).toLocaleString()})` 
      }, { status: 400 });
    }

    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

    // IF Sales Staff, verify they are the ones who GAVE this credit
    if (isSalesStaff) {
      const { data: sale, error: saleError } = await supabaseAdmin
        .from('credit_sales')
        .select('staff_id')
        .eq('id', creditSaleId)
        .single();
      
      if (saleError || !sale) {
        return NextResponse.json({ error: 'Original credit sale record not found' }, { status: 404 });
      }

      if (sale.staff_id !== authResult.id) {
        return NextResponse.json({ 
          error: 'Access denied: You can only receive payments for credit sales that you personally issued.' 
        }, { status: 403 });
      }
    }

    let selectedItems = [];
    if (selectedItemsRaw) {
      try { selectedItems = JSON.parse(selectedItemsRaw); } catch (e) { selectedItems = []; }
    }

    let receiptUrl = null;
    const receiptFile = formData.get('receipt');
    if (receiptFile && receiptFile instanceof File) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const fileName = `credit-payments/${creditorId}/${Date.now()}-${receiptFile.name}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('credit-payments')
        .upload(fileName, buffer, { contentType: receiptFile.type, upsert: false });
      if (uploadError) {
        console.error('Receipt upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage.from('credit-payments').getPublicUrl(fileName);
        receiptUrl = publicUrl;
      }
    }

    const isAdmin = authResult.role === 'admin' || authResult.role === 'superadmin';

    const paymentPayload: any = {
      creditor_id: creditorId,
      credit_sale_id: creditSaleId,
      staff_id: authResult.id,
      amount: Number(amount),
      payment_method: paymentMethod,
      reference_number: referenceNumber || null,
      receipt_url: receiptUrl,
      notes: notes || null,
      status: 'approved',
      approved_by: authResult.id,
      approved_date: new Date().toISOString(),
    };

    if (isAdmin) {
      paymentPayload.remittance_status = 'confirmed';
      paymentPayload.remittance_confirmed_by = authResult.id;
      paymentPayload.remittance_confirmed_at = new Date().toISOString();
    } else {
      paymentPayload.remittance_status = null;
    }

    const { data: payment, error: paymentError } = await supabaseAdmin.from('credit_payments').insert(paymentPayload).select().single();

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

    let paymentItems = [];
    if (selectedItems.length > 0) {
      paymentItems = selectedItems.map((item: any) => ({
        credit_payment_id: payment.id,
        credit_sale_item_id: item.creditSaleItemId,
        item_id: item.itemId,
        quantity: Number(item.quantity),
        amount: Number(item.amount),
      }));
    } else {
      // Auto-allocate payment to items if none were selected
      const { data: saleItems } = await supabaseAdmin
        .from('credit_sale_items')
        .select('*, item:item_id(price_jalingo)')
        .eq('credit_sale_id', creditSaleId);
      
      if (saleItems && saleItems.length > 0) {
        const itemIds = saleItems.map(i => i.id);
        const { data: allExisting } = await supabaseAdmin
          .from('credit_payment_items')
          .select('*')
          .in('credit_sale_item_id', itemIds);
        
        let remainingAmount = Number(amount);
        for (const item of saleItems) {
          if (remainingAmount <= 0) break;
          const sellingPrice = item.item?.price_jalingo || item.unit_price;
          const effectiveTotal = Number(item.quantity) * sellingPrice;
          const itemExisting = allExisting?.filter(e => e.credit_sale_item_id === item.id) || [];
          const paidAmount = itemExisting.reduce((sum, e) => sum + Number(e.amount), 0);
          const itemRemaining = Math.max(0, effectiveTotal - paidAmount);
          
          if (itemRemaining > 0) {
            const pay = Math.min(remainingAmount, itemRemaining);
            const payQty = (pay / effectiveTotal) * Number(item.quantity);
            paymentItems.push({
              credit_payment_id: payment.id,
              credit_sale_item_id: item.id,
              item_id: item.item_id,
              quantity: payQty,
              amount: pay,
            });
            remainingAmount -= pay;
          }
        }
      }
    }

    if (paymentItems.length > 0) {
      const { error: itemsError } = await supabaseAdmin.from('credit_payment_items').insert(paymentItems);
      if (itemsError) console.error('Error inserting payment items:', itemsError);

      // Reconcile balances and store status (Strict Business / 75% Rule)
      for (const pi of paymentItems) {
        const { data: saleItem } = await supabaseAdmin
          .from('credit_sale_items')
          .select('*, item:item_id(price_jalingo)')
          .eq('id', pi.credit_sale_item_id)
          .single();
        if (saleItem) {
          const sellingPrice = saleItem.item?.price_jalingo || saleItem.unit_price;
          const effectiveTotal = Number(saleItem.quantity) * sellingPrice;
          const payQty = effectiveTotal > 0 ? (Number(pi.amount) / effectiveTotal) * Number(saleItem.quantity) : 0;
          const newPaidQty = Number(saleItem.quantity_paid || 0) + payQty;
          await supabaseAdmin.from('credit_sale_items')
            .update({ quantity_paid: newPaidQty })
            .eq('id', pi.credit_sale_item_id);

          const paidPercentage = (newPaidQty / saleItem.quantity) * 100;
          let storeStatus = 'paid';
          if (paidPercentage <= 75 && newPaidQty < saleItem.quantity) {
            storeStatus = 'partially_paid';
          }

          await supabaseAdmin.from('credit_store')
            .update({ status: storeStatus })
            .eq('credit_sale_item_id', pi.credit_sale_item_id);
        }
      }

      // Collect all affected sale IDs (payment items may span multiple sales)
      const csiIds = paymentItems.map((pi: any) => pi.credit_sale_item_id);
      const { data: allReconciled } = await supabaseAdmin.from('credit_sale_items')
        .select('id, credit_sale_id').in('id', csiIds);
      const affectedSaleIds = [...new Set((allReconciled || []).map(si => si.credit_sale_id))];

      for (const sid of affectedSaleIds) {
        const { data: saleItemsForId } = await supabaseAdmin.from('credit_sale_items')
          .select('*').eq('credit_sale_id', sid);
        const allPaid = saleItemsForId?.every(i => (i.quantity_paid || 0) >= i.quantity);
        if (allPaid) {
          await supabaseAdmin.from('credit_sales').update({ status: 'paid' }).eq('id', sid);
        } else {
          await supabaseAdmin.from('credit_sales').update({ status: 'partially_paid' }).eq('id', sid);
        }
      }
    }

    await supabaseAdmin.from('credit_activities').insert({
      creditor_id: creditorId,
      credit_sale_id: creditSaleId,
      credit_payment_id: payment.id,
      staff_id: authResult.id,
      action: 'CREDIT_PAYMENT_MADE',
      details: { 
        amount: Number(amount), 
        method: paymentMethod, 
        receipt_url: receiptUrl,
        items_paid_count: paymentItems.length
      },
    }).then(() => {}, () => {});

    // Send notifications
    try {
      const [{ data: admins }, { data: creditorRecord }] = await Promise.all([
        supabaseAdmin.from('users').select('id').in('role', ['admin', 'superadmin']),
        supabaseAdmin.from('creditors').select('full_name').eq('id', creditorId).single()
      ]);

      const notificationBatch: any[] = [];
      const staffName = authResult.full_name || 'A staff member';
      const creditorName = creditorRecord?.full_name || 'a creditor';

      if (admins) {
        admins.forEach(admin => {
          notificationBatch.push({
            user_id: admin.id,
            type: 'credit_payment',
            title: '💰 Credit Payment Received',
            message: `${staffName} recorded a payment of ₦${Number(amount).toLocaleString()} from ${creditorName}.`,
            is_read: false
          });
        });
      }

      notificationBatch.push({
        user_id: authResult.id,
        type: 'credit_payment_confirmation',
        title: '✅ Payment Logged',
        message: `You have successfully recorded a payment of ₦${Number(amount).toLocaleString()} from ${creditorName}.`,
        is_read: false,
        action_url: `/sales/manage-credits`
      });

      if (notificationBatch.length > 0) {
        const { error: nError } = await supabaseAdmin.from('notifications').insert(notificationBatch);
        if (nError) console.error('Payment notification error:', nError);
      }
    } catch (nError) {
      console.error('Notification processing error:', nError);
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
