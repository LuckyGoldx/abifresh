import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const saleId = params.id;

  try {
    const formData = await req.formData();
    const amount = formData.get('amount');
    const payment_method = formData.get('payment_method') as string;
    const reference_number = formData.get('reference_number') as string;
    const note = formData.get('note') as string;
    const paid_items_raw = formData.get('paid_items') as string;
    const receiptFile = formData.get('receipt');

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const paid_items = paid_items_raw ? JSON.parse(paid_items_raw) : [];

    // Get the credit sale to get the creditor_id
    const { data: sale, error: saleError } = await supabaseAdmin
      .from('credit_sales')
      .select('*')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Credit sale not found' }, { status: 404 });
    }

    // Sales staff can only record payments for credit sales they personally issued
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';
    if (isSalesStaff && sale.staff_id !== authResult.id) {
      return NextResponse.json({ 
        error: 'Access denied: You can only receive payments for credit sales that you personally issued.' 
      }, { status: 403 });
    }

    // Check balance
    const { data: payments } = await supabaseAdmin.from('credit_payments').select('amount').eq('credit_sale_id', saleId).eq('status', 'approved');
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(sale.total_amount) - totalPaid;

    if (Number(amount) > balance) {
      return NextResponse.json({ 
        error: `Payment exceeds receipt balance (₦${balance.toLocaleString()})` 
      }, { status: 400 });
    }

    let receipt_url = null;
    if (receiptFile && receiptFile instanceof File) {
      const buffer = Buffer.from(await receiptFile.arrayBuffer());
      const fileName = `credit-payments/${sale.creditor_id}/${Date.now()}-${receiptFile.name}`;
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('credit-payments')
        .upload(fileName, buffer, { contentType: receiptFile.type, upsert: false });
      
      if (uploadError) {
        console.error('Receipt upload error:', uploadError);
      } else {
        const { data: { publicUrl } } = supabaseAdmin.storage.from('credit-payments').getPublicUrl(fileName);
        receipt_url = publicUrl;
      }
    }

    // Record the payment
    const isAdmin = authResult.role === 'admin' || authResult.role === 'superadmin';

    const paymentPayload: any = {
      creditor_id: sale.creditor_id,
      credit_sale_id: saleId,
      staff_id: authResult.id,
      amount: Number(amount),
      payment_method: payment_method || 'cash',
      reference_number: reference_number || null,
      notes: note || null,
      receipt_url: receipt_url || null,
      status: 'approved',
      approved_by: authResult.id,
      approved_date: new Date().toISOString(),
    };

    if (isAdmin) {
      paymentPayload.remittance_status = 'confirmed';
      paymentPayload.remittance_confirmed_by = authResult.id;
      paymentPayload.remittance_confirmed_at = new Date().toISOString();
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('credit_payments')
      .insert(paymentPayload)
      .select()
      .single();

    if (paymentError) {
      console.error('Payment insertion error:', paymentError);
      return NextResponse.json({ error: paymentError.message }, { status: 400 });
    }

    // Auto-allocate payment to items and reconcile (Strict Business / 75% Rule)
    const { data: saleItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('*, item:item_id(price_jalingo)')
      .eq('credit_sale_id', saleId)
      .order('created_at', { ascending: true });
    
    const paymentItems = [];
    if (saleItems && saleItems.length > 0) {
      // If paid_items were provided, we filter for them, otherwise we allocate to all unpaid items
      const targetItems = (paid_items && paid_items.length > 0) 
        ? saleItems.filter(i => paid_items.includes(i.id))
        : saleItems;

      let remainingAmount = Number(amount);
      
      // Get existing payments for these items to know the remaining item balance
      const { data: allExisting } = await supabaseAdmin
        .from('credit_payment_items')
        .select('*')
        .in('credit_sale_item_id', targetItems.map(i => i.id));

      for (const item of targetItems) {
        if (remainingAmount <= 0) break;
        const sellingPrice = item.item?.price_jalingo || item.unit_price;
        const effectiveTotal = Number(item.quantity) * sellingPrice;
        const itemExisting = allExisting?.filter(e => e.credit_sale_item_id === item.id) || [];
        const alreadyPaidAmount = Math.round(itemExisting.reduce((sum, e) => sum + Number(e.amount), 0) * 100) / 100;
        const itemRemaining = Math.max(0, Math.round((effectiveTotal - alreadyPaidAmount) * 100) / 100);
        
        if (itemRemaining > 0) {
          const pay = Math.round(Math.min(remainingAmount, itemRemaining));
          const payQty = effectiveTotal > 0 ? Math.round((pay / effectiveTotal) * Number(item.quantity) * 100) / 100 : 0;
          
          paymentItems.push({
            credit_payment_id: payment.id,
            credit_sale_item_id: item.id,
            item_id: item.item_id,
            quantity: payQty,
            amount: pay,
          });

          // Reconcile this item immediately
          const newPaidQty = Math.min(Math.round((Number(item.quantity_paid || 0) + payQty) * 100) / 100, item.quantity);
          await supabaseAdmin.from('credit_sale_items')
            .update({ quantity_paid: newPaidQty })
            .eq('id', item.id);

          const paidPercentage = (newPaidQty / Number(item.quantity)) * 100;
          let storeStatus = 'paid';
          if (paidPercentage <= 75 && newPaidQty < Number(item.quantity)) {
            storeStatus = 'partially_paid';
          }

          await supabaseAdmin.from('credit_store')
            .update({ status: storeStatus })
            .eq('credit_sale_item_id', item.id);

          remainingAmount -= pay;
        }
      }

      if (paymentItems.length > 0) {
        await supabaseAdmin.from('credit_payment_items').insert(paymentItems);
      }
    }

    // Check if everything is paid to update sale status
    const { data: updatedItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('*')
      .eq('credit_sale_id', saleId);

    // Check if outstanding is below threshold to mark as paid
    const remainingAfterPayment = Math.max(0, balance - Number(amount));
    if (remainingAfterPayment < 0.5) {
      await supabaseAdmin.from('credit_sales').update({ status: 'paid' }).eq('id', saleId);
    } else {
      await supabaseAdmin.from('credit_sales').update({ status: 'partially_paid' }).eq('id', saleId);
    }

    // Log activity
    await supabaseAdmin.from('credit_activities').insert({
      creditor_id: sale.creditor_id,
      credit_sale_id: saleId,
      credit_payment_id: payment.id,
      staff_id: authResult.id,
      action: 'CREDIT_PAYMENT_MADE',
      details: { 
        amount: Number(amount), 
        method: payment_method, 
        receipt_url,
        items_paid_count: paid_items?.length || 0 
      },
    }).then(() => {}, () => {});

    // SEND NOTIFICATIONS
    try {
      const [{ data: admins }, { data: creditor }] = await Promise.all([
        supabaseAdmin.from('users').select('id').in('role', ['admin', 'superadmin']),
        supabaseAdmin.from('creditors').select('full_name').eq('id', sale.creditor_id).single()
      ]);

      const notificationBatch: any[] = [];
      const staffName = authResult.full_name || 'A staff member';
      const creditorName = creditor?.full_name || 'a creditor';
      
      // Notify admins and superadmins
      if (admins) {
        admins.forEach(admin => {
          notificationBatch.push({
            user_id: admin.id,
            type: 'credit_payment',
            title: '💰 Credit Payment Received',
            message: `${staffName} recorded a payment of ₦${Number(amount).toLocaleString()} from ${creditorName} for receipt ${sale.receipt_number}.`,
            is_read: false
          });
        });
      }

      // Notify the staff member
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

    return NextResponse.json({ 
      message: 'Payment recorded successfully',
      payment
    });
  } catch (error: any) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
