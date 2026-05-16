import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: creditor, error } = await supabaseAdmin.from('creditors').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: 'Creditor not found' }, { status: 404 });

  const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

  // Fetch sales and payments
  let salesQuery = supabaseAdmin.from('credit_sales').select('*, users(full_name), credit_sale_items(*)').eq('creditor_id', params.id).order('created_at', { ascending: false });
  let paymentsQuery = supabaseAdmin.from('credit_payments').select('*, staff:users!credit_payments_staff_id_fkey(full_name)').eq('creditor_id', params.id).order('created_at', { ascending: false });

  // IF Sales Staff, only fetch THEIR sales
  if (isSalesStaff) {
    salesQuery = salesQuery.eq('staff_id', authResult.id);
  }

  const [creditSales, creditPayments] = await Promise.all([salesQuery, paymentsQuery]);

  const allSales = creditSales.data || [];
  const allPayments = creditPayments.data || [];

  // Verify access for Sales Staff: strictly must have added them
  if (isSalesStaff && creditor.added_by !== authResult.id) {
    return NextResponse.json({ error: 'You do not have permission to view this creditor. Ownership restricted.' }, { status: 403 });
  }
  
  // Fetch payment items to calculate individual item paid quantities
  const paymentIds = allPayments.map(p => p.id);
  const { data: allPaymentItems } = paymentIds.length > 0 
    ? await supabaseAdmin.from('credit_payment_items').select('*').in('credit_payment_id', paymentIds)
    : { data: [] };

  // 1. Lifetime Totals
  const lifetimeTotalCredited = allSales.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const lifetimeTotalPaid = allPayments.filter(p => p.status === 'approved').reduce((sum, p) => sum + Number(p.amount), 0);
  const lifetimeTotalQuantity = allSales.reduce((sum, s) => sum + Number(s.total_quantity), 0);

  // 2. Outstanding & Active Quantity
  let outstanding = 0;
  let activeCreditQuantity = 0;
  
  const activeSales = allSales.filter(s => s.status !== 'cancelled');
  activeSales.forEach(s => {
    const receiptPayments = allPayments.filter(p => p.credit_sale_id === s.id && p.status === 'approved');
    const receiptPaid = receiptPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Math.max(0, Number(s.total_amount) - receiptPaid);
    outstanding += balance;
    
    // Calculate precise active quantity for each item in this receipt
    const sItems = s.credit_sale_items || [];

    sItems.forEach((item: any) => {
      const itemPayments = (allPaymentItems || []).filter((pi: any) => String(pi.credit_sale_item_id) === String(item.id));
      let itemPaidQty = itemPayments.reduce((sum: number, pi: any) => sum + Number(pi.quantity), 0);
      
      // Fallback: If sale is fully paid, item is paid
      if (s.status === 'paid') itemPaidQty = Number(item.quantity);
      
      const itemRemainingQty = Math.max(0, Number(item.quantity) - itemPaidQty);
      activeCreditQuantity += itemRemainingQty;
    });
  });

  return NextResponse.json({
    ...creditor,
    total_credit_amount: lifetimeTotalCredited,
    total_paid: lifetimeTotalPaid,
    outstanding: outstanding,
    total_quantity: lifetimeTotalQuantity,
    active_credit_quantity: activeCreditQuantity,
    credit_sales: allSales.map((s: any) => {
      const receiptPayments = allPayments.filter(p => p.credit_sale_id === s.id && p.status === 'approved');
      const paidAmountForSale = receiptPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      
      // Calculate how much was already specifically allocated to items via credit_payment_items
      const saleItemIds = (s.credit_sale_items || []).map((i: any) => String(i.id));
      const allocatedAmountForSale = (allPaymentItems || [])
        .filter((pi: any) => saleItemIds.includes(String(pi.credit_sale_item_id)))
        .reduce((sum, pi) => sum + Number(pi.amount), 0);
      
      let unallocatedAmount = Math.max(0, paidAmountForSale - allocatedAmountForSale);

      const enrichedItems = (s.credit_sale_items || []).map((item: any) => {
        const itemPayments = (allPaymentItems || []).filter((pi: any) => String(pi.credit_sale_item_id) === String(item.id));
        let itemPaidQty = itemPayments.reduce((sum: number, pi: any) => sum + Number(pi.quantity), 0);
        let itemPaidAmt = itemPayments.reduce((sum: number, pi: any) => sum + Number(pi.amount), 0);
        
        // FALLBACK: If there's unallocated money for this sale, distribute it to items for display
        if (unallocatedAmount > 0 && itemPaidAmt < Number(item.total_price)) {
          const remainingItemAmt = Number(item.total_price) - itemPaidAmt;
          const distribute = Math.min(unallocatedAmount, remainingItemAmt);
          const distributeQty = (distribute / Number(item.total_price)) * Number(item.quantity);
          
          itemPaidQty += distributeQty;
          itemPaidAmt += distribute;
          unallocatedAmount -= distribute;
        }

        const paidPercentage = item.quantity > 0 ? (itemPaidQty / item.quantity) * 100 : 0;
        
        // Rule: If > 75% paid, it cannot be returned. 
        // If <= 75%, the unpaid part is returnable (rounded up to nearest 0.5 to protect business).
        let returnableQty = 0;
        if (paidPercentage <= 75) {
          const unpaid = Number(item.quantity) - itemPaidQty;
          returnableQty = Math.ceil(unpaid * 2) / 2;
        }

        return {
          ...item,
          quantity_paid: itemPaidQty,
          paid_percentage: Math.round(paidPercentage),
          returnable_quantity: returnableQty
        };
      });

      return {
        ...s,
        credit_sale_items: enrichedItems,
        items_count: (s.credit_sale_items || []).length,
        paid_amount: paidAmountForSale
      };
    }),
    payment_history: allPayments,
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const updates: any = {};
  if (body.full_name) updates.full_name = body.full_name.trim();
  if (body.phone_number !== undefined) updates.phone_number = body.phone_number?.trim() || null;
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.address !== undefined) updates.address = body.address?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await supabaseAdmin.from('creditors').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  supabaseAdmin.from('credit_activities').insert({
    creditor_id: params.id,
    staff_id: authResult.id,
    action: 'CREDITOR_UPDATED',
    details: updates,
  }).then(() => {}, () => {});

  return NextResponse.json(data);
}
