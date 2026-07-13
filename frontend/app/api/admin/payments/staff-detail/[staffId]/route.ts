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
      .neq('payment_type', 'credit_remittance')
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

        // Unpaid = sales_items not covered by any payment's sale_ids
        const unpaid = (siData || []).filter((si: any) =>
          !approvedSaleIds.has(si.id) && !pendingSaleIds.has(si.id)
        );

        // Group by item_id
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

      // Build paid quantities map using quantity-based proportional distribution
      // matching sales-history/route.ts logic
      const paidQuantities = new Map<string, number>();
      for (const p of paymentsData || []) {
        if (p.status !== 'approved' && p.status !== 'pending') continue;
        if (!Array.isArray(p.items_paid_for)) continue;
        for (const item of p.items_paid_for) {
          const saleIds: string[] = Array.isArray(item.sale_ids)
            ? item.sale_ids
            : item.sale_id
            ? [item.sale_id]
            : [];
          const paidQty = parseFloat(item.quantity) || 0;
          if (paidQty <= 0) continue;

          if (saleIds.length === 1) {
            const sid = saleIds[0];
            paidQuantities.set(sid, (paidQuantities.get(sid) || 0) + paidQty);
          } else {
            let remaining = paidQty;
            for (const sid of saleIds) {
              if (remaining <= 0) break;
              const found = (ssData || []).find((s: any) => s.id === sid);
              const origQty = found ? parseFloat(found.quantity) || 0 : 0;
              if (origQty <= 0) continue;
              const already = paidQuantities.get(sid) || 0;
              const cap = Math.max(0, origQty - already);
              const alloc = Math.min(cap, remaining);
              paidQuantities.set(sid, already + alloc);
              remaining -= alloc;
            }
            if (remaining > 0 && saleIds[0] && (ssData || []).find((s: any) => s.id === saleIds[0])) {
              paidQuantities.set(saleIds[0], (paidQuantities.get(saleIds[0]) || 0) + remaining);
            }
          }
        }
      }

      // Group staff_sales with remaining quantity > 0
      // Proportional share of total_amount accounts for logistics fees
      const map = new Map<string, any>();
      for (const s of ssData || []) {
        const paidQty = paidQuantities.get(s.id) || 0;
        const origQty = parseFloat(s.quantity) || 0;
        const origTotal = parseFloat(s.total_amount) || 0;
        const price = parseFloat(s.unit_price) || 0;
        const remainingQty = Math.max(0, origQty - paidQty);
        if (remainingQty <= 0) continue;

        const remainingAmount = origQty > 0 ? origTotal * (remainingQty / origQty) : 0;
        const name = (s.items as any)?.name || 'Unknown';
        const key = `${s.item_id}_${price}`;
        if (map.has(key)) {
          const ex = map.get(key)!;
          ex.quantity += remainingQty;
          ex.total_amount += remainingAmount;
          ex.sale_ids.push(s.id);
        } else {
          map.set(key, {
            id: key,
            item_id: s.item_id,
            item_name: name,
            quantity: remainingQty,
            unit_price: price,
            total_amount: remainingAmount,
            sale_ids: [s.id],
            sale_date: s.sale_date,
          });
        }
      }
      unpaidItems = Array.from(map.values());
    }

    // Use simple math for outstanding (matches staff-summary calculation)
    const outstandingAmount = Math.max(0, allTimeTotalSales - approvedAmount - pendingAmount);

    // Normalize unpaid items total_amount to match monetary outstanding
    if (unpaidItems.length > 0) {
      const rawTotal = unpaidItems.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
      if (rawTotal > 0 && Math.abs(rawTotal - outstandingAmount) > 1) {
        const scale = outstandingAmount / rawTotal;
        let adj = 0;
        for (let i = 0; i < unpaidItems.length; i++) {
          const scaled = unpaidItems[i].total_amount * scale;
          const rounded = Math.round(scaled * 100) / 100;
          unpaidItems[i].total_amount = rounded;
          adj += rounded;
        }
        const diff = Math.round((outstandingAmount - adj) * 100) / 100;
        if (unpaidItems.length > 0) unpaidItems[unpaidItems.length - 1].total_amount += diff;
      }
    }

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
