import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

function formatOrder(order: any) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    date: order.created_at,
    items: (order.restock_order_items || []).map((item: any) => ({
      id: item.item_id,
      name: item.item_name,
      sku: item.sku || '',
      category: item.category || '',
      currentStock: item.current_stock,
      orderQuantity: item.order_quantity,
      unitPrice: parseFloat(item.unit_price),
      brand: item.brand || '',
      package_type: item.package_type || '',
    })),
    totalItems: order.total_items,
    totalQuantity: order.total_quantity,
    totalCost: parseFloat(order.total_cost),
    note: order.note || '',
    status: order.status,
    showItemName: order.show_item_name !== false,
    showSku: order.show_sku === true,
    showCategory: order.show_category === true,
    showBrandName: order.show_brand_name !== false,
    showPackageType: order.show_package_type !== false,
    showCurrentStock: order.show_current_stock === true,
    showOrderQuantity: order.show_order_quantity !== false,
    showUnitPrice: order.show_unit_price,
    showSubtotal: order.show_subtotal,
  };
}

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: orders, error } = await supabaseAdmin
    .from('restock_orders')
    .select('*, restock_order_items (*)')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json((orders || []).map(formatOrder));
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      orderNumber, items, totalItems, totalQuantity, totalCost, note,
      showItemName, showSku, showCategory, showBrandName, showPackageType,
      showCurrentStock, showOrderQuantity, showUnitPrice, showSubtotal,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('restock_orders')
      .insert([{
        order_number: orderNumber,
        created_by: authResult.id,
        total_items: totalItems,
        total_quantity: totalQuantity,
        total_cost: totalCost,
        note: note || '',
        status: 'pending',
        show_item_name: showItemName !== false,
        show_sku: showSku === true,
        show_category: showCategory === true,
        show_brand_name: showBrandName !== false,
        show_package_type: showPackageType !== false,
        show_current_stock: showCurrentStock === true,
        show_order_quantity: showOrderQuantity !== false,
        show_unit_price: showUnitPrice !== undefined ? showUnitPrice : true,
        show_subtotal: showSubtotal !== undefined ? showSubtotal : true,
      }])
      .select()
      .single();

    if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });

    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      item_id: item.id,
      item_name: item.name,
      sku: item.sku || '',
      category: item.category || '',
      brand: item.brand || '',
      package_type: item.package_type || '',
      current_stock: item.currentStock,
      order_quantity: item.orderQuantity,
      unit_price: item.unitPrice,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('restock_order_items')
      .insert(orderItems);

    if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 400 });

    return NextResponse.json(formatOrder({ ...order, restock_order_items: orderItems }), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
