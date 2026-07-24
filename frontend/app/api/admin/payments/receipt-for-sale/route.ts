import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const saleIdsParam = searchParams.get('saleIds');

  if (!saleIdsParam) {
    return NextResponse.json({ error: 'saleIds is required' }, { status: 400 });
  }

  const saleIds = saleIdsParam.split(',').filter(Boolean);

  // Get receipt info from the first sale — try staff_sales first (commission/non-commission staff)
  let { data: staffSales } = await supabaseAdmin
    .from('staff_sales')
    .select('id, item_id, receipt_number, receipt_id, sale_date, created_at, sold_outside_jalingo')
    .in('id', saleIds);

  // Fallback to sales table (sales staff)
  if (!staffSales || staffSales.length === 0) {
    // sale_ids might reference sales.id or sales_items.id — try sales first
    let { data: salesRows } = await supabaseAdmin
      .from('sales')
      .select('id, receipt_number, receipt_id, created_at, sold_outside_jalingo')
      .in('id', saleIds)
      .limit(1);

    // If no match on sales.id, try sales_items.sale_id
    if (!salesRows || salesRows.length === 0) {
      const { data: salesItemRows } = await supabaseAdmin
        .from('sales_items')
        .select('sale_id')
        .in('id', saleIds)
        .limit(1);
      if (salesItemRows && salesItemRows.length > 0) {
        const { data: s } = await supabaseAdmin
          .from('sales')
          .select('id, receipt_number, receipt_id, created_at, sold_outside_jalingo')
          .eq('id', salesItemRows[0].sale_id)
          .limit(1);
        salesRows = s || null;
      }
    }

    if (!salesRows || salesRows.length === 0) {
      return NextResponse.json({ receipt_number: null, items: [], total_amount: 0, item_count: 0, sale_id: null, sale_item_id: null });
    }

    const sale = salesRows[0];
    let saleItems: any[] = [];
    if (sale.receipt_id) {
      const { data: rItems } = await supabaseAdmin
        .from('receipt_items')
        .select('id, item_id, quantity, unit_price, total_price, items(id, name)')
        .eq('receipt_id', sale.receipt_id);
      saleItems = (rItems || []).map((ri: any) => ({
        id: ri.id,
        item_id: ri.item_id,
        quantity: ri.quantity,
        unit_price: ri.unit_price,
        total_amount: ri.total_price || ri.quantity * ri.unit_price,
        item_name: ri.items?.name || 'Unknown',
      }));
    } else {
      const { data: si } = await supabaseAdmin
        .from('sales_items')
        .select('id, item_id, quantity, unit_price, logistics_fee, items(id, name)')
        .eq('sale_id', sale.id);
      saleItems = (si || []).map((sii: any) => ({
        id: sii.id,
        item_id: sii.item_id,
        quantity: sii.quantity,
        unit_price: sii.unit_price,
        total_amount: sii.quantity * (sii.unit_price + (sii.logistics_fee || 0)),
        item_name: sii.items?.name || 'Unknown',
      }));
    }
    const totalAmount = saleItems.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
    const firstItem = saleItems[0];
    return NextResponse.json({
      receipt_number: sale.receipt_number || `sale-${sale.id}`,
      items: saleItems,
      total_amount: totalAmount,
      item_count: saleItems.length,
      sale_date: sale.created_at,
      sold_outside_jalingo: sale.sold_outside_jalingo || false,
      sale_id: sale.id,
      sale_item_id: firstItem?.item_id || null,
    });
  }

  const firstSale = staffSales[0];

  // Fetch all items in the same receipt — try receipt_id first, then receipt_number
  let receiptItems: any[] | null = null;

  if (firstSale.receipt_id) {
    const { data } = await supabaseAdmin
      .from('staff_sales')
      .select('id, item_id, quantity, unit_price, total_amount, items:item_id(id, name)')
      .eq('receipt_id', firstSale.receipt_id)
      .order('created_at', { ascending: true });
    receiptItems = data;
  }

  if (!receiptItems || receiptItems.length === 0) {
    const receiptNumber = firstSale.receipt_number;
    if (receiptNumber) {
      const { data } = await supabaseAdmin
        .from('staff_sales')
        .select('id, item_id, quantity, unit_price, total_amount, items:item_id(id, name)')
        .eq('receipt_number', receiptNumber)
        .order('created_at', { ascending: true });
      receiptItems = data;
    }
  }

  if (receiptItems && receiptItems.length > 0) {
    const items = receiptItems.map((s: any) => ({
      id: s.id,
      item_id: s.item_id,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total_amount: s.total_amount,
      item_name: s.items?.name || 'Unknown',
    }));
    const totalAmount = items.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
    return NextResponse.json({
      receipt_number: firstSale.receipt_number || `receipt-${firstSale.receipt_id}`,
      items,
      total_amount: totalAmount,
      item_count: items.length,
      sale_date: firstSale.sale_date || firstSale.created_at,
      sold_outside_jalingo: firstSale.sold_outside_jalingo,
      sale_id: firstSale.id,
      sale_item_id: firstSale.item_id,
    });
  }

  // Fallback to sales table (front-desk sales) using receipt_number
  if (firstSale.receipt_number) {
    const { data: salesRows } = await supabaseAdmin
      .from('sales')
      .select('id, receipt_number, total_amount, payment_method, sale_date, created_at, sales_items(*, items(name)), users!staff_id(full_name)')
      .eq('receipt_number', firstSale.receipt_number)
      .limit(1);

    const salesRow = salesRows && salesRows.length > 0 ? salesRows[0] : null;
    if (salesRow) {
      const items = (salesRow.sales_items || []).map((si: any) => ({
        id: si.id,
        item_id: si.item_id,
        quantity: si.quantity,
        unit_price: si.unit_price,
        total_amount: (si.quantity || 0) * (si.unit_price || 0),
        item_name: si.items?.name || 'Unknown',
      }));
      const totalAmount = items.reduce((sum: number, i: any) => sum + (i.total_amount || 0), 0);
      return NextResponse.json({
        receipt_number: firstSale.receipt_number,
        items,
        total_amount: totalAmount,
        item_count: items.length,
        sale_date: salesRow.sale_date || salesRow.created_at,
        sold_outside_jalingo: firstSale.sold_outside_jalingo,
        sale_id: firstSale.id,
        sale_item_id: firstSale.item_id,
      });
    }
  }

  return NextResponse.json({ receipt_number: null, items: [], total_amount: 0, item_count: 0, sale_id: firstSale.id, sale_item_id: firstSale.item_id });
}
