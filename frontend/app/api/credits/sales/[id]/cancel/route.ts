import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { data: creditSale } = await supabaseAdmin.from('credit_sales').select('*').eq('id', params.id).single();
    if (!creditSale) return NextResponse.json({ error: 'Credit sale not found' }, { status: 404 });
    if (creditSale.status === 'cancelled') return NextResponse.json({ error: 'Credit sale already cancelled' }, { status: 400 });

    // Get all items and their paid status
    const { data: saleItems } = await supabaseAdmin
      .from('credit_sale_items')
      .select('*')
      .eq('credit_sale_id', params.id);

    if (saleItems && saleItems.length > 0) {
      for (const item of saleItems) {
        const totalQty = Number(item.quantity);
        const paidQty = Number(item.quantity_paid || 0);
        const paidPercentage = totalQty > 0 ? (paidQty / totalQty) * 100 : 0;

        if (paidPercentage <= 75) {
          // Strict Business: update status and set quantity to the unpaid part (rounded UP to nearest 0.5)
          const unpaid = totalQty - paidQty;
          const returnableQty = Math.ceil(unpaid * 2) / 2;

          if (returnableQty >= 0.5) {
            await supabaseAdmin.from('credit_store')
              .update({ 
                status: 'available for return',
                quantity: returnableQty 
              })
              .eq('credit_sale_item_id', item.id);
          } else {
            // Mark as paid if returnable quantity is 0
            await supabaseAdmin.from('credit_store')
              .update({ status: 'paid' })
              .eq('credit_sale_item_id', item.id);
          }
        } else {
          // Above 75% paid: mark as paid/sold, cannot be returned
          await supabaseAdmin.from('credit_store')
            .update({ status: 'paid' })
            .eq('credit_sale_item_id', item.id);
        }
      }
    }

    await supabaseAdmin.from('credit_sales')
      .update({ status: 'cancelled' })
      .eq('id', params.id);

    supabaseAdmin.from('credit_activities').insert({
      creditor_id: creditSale.creditor_id,
      credit_sale_id: params.id,
      staff_id: authResult.id,
      action: 'CREDIT_CANCELLED',
      details: { receipt_number: creditSale.receipt_number },
    }).then().catch(() => {});

    // SEND NOTIFICATIONS
    try {
      const [{ data: admins }, { data: creditor }] = await Promise.all([
        supabaseAdmin.from('users').select('id').in('role', ['admin', 'superadmin']),
        supabaseAdmin.from('creditors').select('full_name').eq('id', creditSale.creditor_id).single()
      ]);

      const notificationBatch: any[] = [];
      const staffName = authResult.full_name || 'A staff member';
      const creditorName = creditor?.full_name || 'a creditor';
      
      // Notify admins and superadmins
      if (admins) {
        admins.forEach(admin => {
          notificationBatch.push({
            user_id: admin.id,
            type: 'credit_cancelled',
            title: '🚫 Credit Sale Cancelled',
            message: `${staffName} cancelled credit receipt ${creditSale.receipt_number} for ${creditorName}.`,
            is_read: false
          });
        });
      }

      // Notify the staff member
      notificationBatch.push({
        user_id: authResult.id,
        type: 'credit_cancel_confirmation',
        title: '✅ Sale Cancelled',
        message: `You have successfully cancelled credit receipt ${creditSale.receipt_number}.`,
        is_read: false,
        action_url: `/sales/manage-credits`
      });

      if (notificationBatch.length > 0) {
        const { error: nError } = await supabaseAdmin.from('notifications').insert(notificationBatch);
        if (nError) console.error('Cancel notification error:', nError);
      }
    } catch (nError) {
      console.error('Notification processing error:', nError);
    }

    return NextResponse.json({ message: 'Credit cancelled successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
