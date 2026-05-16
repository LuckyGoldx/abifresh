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

    const { data: payment, error: paymentError } = await supabaseAdmin.from('credit_payments').insert({
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
      remittance_status: null,
    }).select().single();

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
        .select('*')
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
          const itemExisting = allExisting?.filter(e => e.credit_sale_item_id === item.id) || [];
          const paidAmount = itemExisting.reduce((sum, e) => sum + Number(e.amount), 0);
          const itemRemaining = Math.max(0, Number(item.total_price) - paidAmount);
          
          if (itemRemaining > 0) {
            const pay = Math.min(remainingAmount, itemRemaining);
            // Calculate quantity proportionally
            const payQty = (pay / Number(item.total_price)) * Number(item.quantity);
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
        const { data: saleItem } = await supabaseAdmin.from('credit_sale_items').select('*').eq('id', pi.credit_sale_item_id).single();
        if (saleItem) {
          const newPaidQty = Number(saleItem.quantity_paid || 0) + Number(pi.quantity);
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

      // Check if the whole sale is now paid
      const { data: allItems } = await supabaseAdmin.from('credit_sale_items').select('*').eq('credit_sale_id', creditSaleId);
      const allPaid = allItems?.every(i => (i.quantity_paid || 0) >= i.quantity);
      if (allPaid) {
        await supabaseAdmin.from('credit_sales').update({ status: 'paid' }).eq('id', creditSaleId);
      } else {
        await supabaseAdmin.from('credit_sales').update({ status: 'partially_paid' }).eq('id', creditSaleId);
      }
    }

    supabaseAdmin.from('credit_activities').insert({
      creditor_id: creditorId,
      credit_sale_id: creditSaleId,
      credit_payment_id: payment.id,
      staff_id: authResult.id,
      action: 'CREDIT_PAYMENT_MADE',
      details: { amount: Number(amount), payment_method: paymentMethod },
    }).then().catch(() => {});

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
