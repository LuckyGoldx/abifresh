import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { data: payment } = await supabaseAdmin.from('credit_payments').select('*').eq('id', params.id).single();
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await supabaseAdmin.from('credit_payments')
      .update({ status: 'approved', approved_by: authResult.id, approved_date: new Date().toISOString() })
      .eq('id', params.id);

    const { data: paymentItems } = await supabaseAdmin.from('credit_payment_items').select('*').eq('credit_payment_id', params.id);

    if (paymentItems && paymentItems.length > 0) {
      for (const item of paymentItems) {
        const { data: saleItem } = await supabaseAdmin.from('credit_sale_items').select('*').eq('id', item.credit_sale_item_id).single();
        if (saleItem) {
          const newPaidQty = (saleItem.quantity_paid || 0) + item.quantity;
          await supabaseAdmin.from('credit_sale_items')
            .update({ quantity_paid: newPaidQty })
            .eq('id', item.credit_sale_item_id);

          const paidPercentage = (newPaidQty / saleItem.quantity) * 100;
          let storeStatus = 'paid';
          if (paidPercentage <= 75 && newPaidQty < saleItem.quantity) {
            storeStatus = 'partially_paid';
          }

          await supabaseAdmin.from('credit_store')
            .update({ status: storeStatus })
            .eq('credit_sale_item_id', item.credit_sale_item_id);
        }
      }
    } else {
      // Robust FIFO Auto-Allocation fallback
      const { data: saleItems } = await supabaseAdmin
        .from('credit_sale_items')
        .select('*')
        .eq('credit_sale_id', payment.credit_sale_id);
      
      if (saleItems && saleItems.length > 0) {
        let remainingAmount = Number(payment.amount);
        
        // Find already recorded payment items to calculate current item balances
        const { data: allExisting } = await supabaseAdmin
          .from('credit_payment_items')
          .select('*')
          .in('credit_sale_item_id', saleItems.map(i => i.id));

        const newPaymentItems = [];

        for (const si of saleItems) {
          if (remainingAmount <= 0) break;
          const itemExisting = allExisting?.filter(e => e.credit_sale_item_id === si.id) || [];
          const alreadyPaidAmt = itemExisting.reduce((sum, e) => sum + Number(e.amount), 0);
          const itemBalance = Math.max(0, Number(si.total_price) - alreadyPaidAmt);

          if (itemBalance > 0) {
            const pay = Math.min(remainingAmount, itemBalance);
            const payQty = (pay / Number(si.total_price)) * Number(si.quantity);
            
            newPaymentItems.push({
              credit_payment_id: params.id,
              credit_sale_item_id: si.id,
              item_id: si.item_id,
              quantity: payQty,
              amount: pay,
            });

            // Update quantities and store status (Strict Business Rule)
            const newPaidQty = Number(si.quantity_paid || 0) + payQty;
            await supabaseAdmin.from('credit_sale_items')
              .update({ quantity_paid: newPaidQty })
              .eq('id', si.id);

            const paidPercentage = (newPaidQty / Number(si.quantity)) * 100;
            let storeStatus = 'paid';
            if (paidPercentage <= 75 && newPaidQty < Number(si.quantity)) {
              storeStatus = 'partially_paid';
            }

            await supabaseAdmin.from('credit_store')
              .update({ status: storeStatus })
              .eq('credit_sale_item_id', si.id);

            remainingAmount -= pay;
          }
        }

        if (newPaymentItems.length > 0) {
          await supabaseAdmin.from('credit_payment_items').insert(newPaymentItems);
        }
      }
    }

    const { data: allItems } = await supabaseAdmin.from('credit_sale_items').select('*').eq('credit_sale_id', payment.credit_sale_id);
    const allPaid = allItems?.every(i => (i.quantity_paid || 0) >= i.quantity);
    if (allPaid) {
      await supabaseAdmin.from('credit_sales').update({ status: 'paid' }).eq('id', payment.credit_sale_id);
    } else {
      await supabaseAdmin.from('credit_sales').update({ status: 'partially_paid' }).eq('id', payment.credit_sale_id);
    }

    supabaseAdmin.from('credit_activities').insert({
      creditor_id: payment.creditor_id,
      credit_sale_id: payment.credit_sale_id,
      credit_payment_id: params.id,
      staff_id: authResult.id,
      action: 'PAYMENT_APPROVED',
      details: { amount: payment.amount },
    }).then().catch(() => {});

    return NextResponse.json({ message: 'Payment approved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
