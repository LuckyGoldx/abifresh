import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const SALES_ROLES = new Set(['sales', 'sales_staff']);

export async function GET(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { staffId } = params;

  try {
    // 1. Fetch staff info
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, phone_number')
      .eq('id', staffId)
      .single();

    if (staffErr || !staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const isSales = SALES_ROLES.has(staff.role);

    // 2. Fetch all payment history for this staff
    const { data: paymentsData, error: pmErr } = await supabaseAdmin
      .from('staff_payments')
      .select('*')
      .eq('staff_id', staffId)
      .or('payment_type.neq.commission,paid_by.is.null')
      .order('created_at', { ascending: false });

    if (pmErr) throw pmErr;

    // 3. Build paid/pending sale_id sets and amount totals
    let approvedAmount = 0;
    let pendingAmount = 0;
    const approvedSaleIds = new Set<string>();
    const pendingSaleIds = new Set<string>();

    for (const p of paymentsData || []) {
      const amt = parseFloat(p.amount) || 0;
      if (p.status === 'approved') approvedAmount += amt;
      else if (p.status === 'pending') pendingAmount += amt;

      if (Array.isArray(p.items_paid_for)) {
        for (const item of p.items_paid_for) {
          const ids: string[] = Array.isArray(item.sale_ids)
            ? item.sale_ids
            : item.sale_id
            ? [item.sale_id]
            : [];
          for (const id of ids) {
            if (p.status === 'approved') approvedSaleIds.add(id);
            else if (p.status === 'pending') pendingSaleIds.add(id);
          }
        }
      }
    }

    // 4. Fetch sales and compute stats + unpaid items
    let allTimeQty = 0;
    let allTimeTotalSales = 0;
    let unpaidItems: any[] = [];

    if (isSales) {
      // Sales staff → sales + sales_items tables
      const { data: salesData, error: salesErr } = await supabaseAdmin
        .from('sales')
        .select('id, total_amount')
        .eq('staff_id', staffId);
      if (salesErr) throw salesErr;

      allTimeTotalSales = (salesData || []).reduce(
        (sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0),
        0
      );

      if ((salesData || []).length > 0) {
        const saleIds = (salesData || []).map((s: any) => s.id);
        const { data: siData, error: siErr } = await supabaseAdmin
          .from('sales_items')
          .select('id, item_id, quantity, unit_price, items:item_id(name), created_at')
          .in('sale_id', saleIds)
          .order('created_at', { ascending: false });
        if (siErr) throw siErr;

        allTimeQty = (siData || []).reduce(
          (sum: number, si: any) => sum + (parseFloat(si.quantity) || 0),
          0
        );

        // Unpaid = compute remaining amount from payment items
        const unpaid = (siData || []).filter((si: any) => {
          const qty = parseFloat(si.quantity) || 0;
          const price = parseFloat(si.unit_price) || 0;
          const total = qty * price;
          let paidOnItem = 0;
          for (const p of paymentsData || []) {
            if (Array.isArray(p.items_paid_for)) {
              for (const pi of p.items_paid_for) {
                const ids: string[] = Array.isArray(pi.sale_ids) ? pi.sale_ids : pi.sale_id ? [pi.sale_id] : [];
                if (ids.includes(si.id) && (p.status === 'approved' || p.status === 'pending')) {
                  paidOnItem += parseFloat(pi.amount) || 0;
                }
              }
            }
          }
          return total - paidOnItem > 1;
        });

        // Group by item_id (same item at same price combined)
        const map = new Map<string, any>();
        for (const si of unpaid) {
          const name = (si.items as any)?.name || 'Unknown';
          const qty = parseFloat(si.quantity) || 0;
          const price = parseFloat(si.unit_price) || 0;
          const total = qty * price;
          if (map.has(si.item_id)) {
            const ex = map.get(si.item_id)!;
            ex.quantity += qty;
            ex.total_amount += total;
            ex.sale_ids.push(si.id);
          } else {
            map.set(si.item_id, {
              id: si.item_id,
              item_id: si.item_id,
              item_name: name,
              quantity: qty,
              unit_price: price,
              total_amount: total,
              sale_ids: [si.id],
              sale_date: si.created_at,
            });
          }
        }
        unpaidItems = Array.from(map.values());
      }
    } else {
      // Non-sales staff (commission + non-commission) → staff_sales table
      const { data: ssData, error: ssErr } = await supabaseAdmin
        .from('staff_sales')
        .select('id, item_id, quantity, unit_price, total_amount, sale_date, items:item_id(name)')
        .eq('staff_id', staffId)
        .order('sale_date', { ascending: false });
      if (ssErr) throw ssErr;

      allTimeTotalSales = (ssData || []).reduce(
        (sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0),
        0
      );
      allTimeQty = (ssData || []).reduce(
        (sum: number, s: any) => sum + (parseFloat(s.quantity) || 0),
        0
      );

      // Unpaid = compute remaining amount from payment items
      const unpaid = (ssData || []).filter((s: any) => {
        const total = parseFloat(s.total_amount) || 0;
        let paidOnItem = 0;
        for (const p of paymentsData || []) {
          if (Array.isArray(p.items_paid_for)) {
            for (const pi of p.items_paid_for) {
              const ids: string[] = Array.isArray(pi.sale_ids) ? pi.sale_ids : pi.sale_id ? [pi.sale_id] : [];
              if (ids.includes(s.id) && (p.status === 'approved' || p.status === 'pending')) {
                paidOnItem += parseFloat(pi.amount) || 0;
              }
            }
          }
        }
        return total - paidOnItem > 1;
      });

      // Group by item_id + unit_price (mirrors staff-store.service.ts logic)
      const map = new Map<string, any>();
      for (const s of unpaid) {
        const name = (s.items as any)?.name || 'Unknown';
        const qty = parseFloat(s.quantity) || 0;
        const price = parseFloat(s.unit_price) || 0;
        const total = parseFloat(s.total_amount) || 0;
        const key = `${s.item_id}_${price}`;
        if (map.has(key)) {
          const ex = map.get(key)!;
          ex.quantity += qty;
          ex.total_amount += total;
          ex.sale_ids.push(s.id);
        } else {
          map.set(key, {
            id: key,
            item_id: s.item_id,
            item_name: name,
            quantity: qty,
            unit_price: price,
            total_amount: total,
            sale_ids: [s.id],
            sale_date: s.sale_date,
          });
        }
      }
      unpaidItems = Array.from(map.values());
    }

    // Compute outstanding amount from unpaid items for consistency
    const outstandingAmount = unpaidItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);

    return NextResponse.json({
      staff,
      stats: {
        allTimeQty,
        allTimeTotalSales,
        approvedAmount,
        pendingAmount,
        outstandingAmount,
      },
      payments: paymentsData || [],
      unpaidItems,
    });
  } catch (error: any) {
    console.error('Error in staff-detail:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
