import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { staffId: string } }
) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { staffId } = params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get staff info
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, username, role')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) {
      return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    }

    // Build query for staff_sales (primary source - matches staff dashboard)
    let salesQuery = supabaseAdmin
      .from('staff_sales')
      .select('*, items:item_id(id, name, commission, category)')
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false });

    if (startDate) {
      salesQuery = salesQuery.gte('created_at', startDate);
    }
    if (endDate) {
      salesQuery = salesQuery.lte('created_at', endDate);
    }

    const { data: sales, error: salesError } = await salesQuery;

    if (salesError) {
      return NextResponse.json({ error: salesError.message }, { status: 400 });
    }

    if (!sales || sales.length === 0) {
      return NextResponse.json({
        staff,
        total_commission: 0,
        total_sales: 0,
        total_items_sold: 0,
        receipts: [],
        commission_by_item: [],
      });
    }

    // Transform staff_sales data to match the receipts format expected by frontend
    const receiptsWithCommission = sales.map((sale: any) => {
      const item = sale.items || {};
      const commissionPerUnit = item.commission || 0;
      const totalCommission = commissionPerUnit * sale.quantity;

      return {
        id: sale.id,
        receipt_number: sale.receipt_number,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        commission: totalCommission,
        items: [
          {
            item_id: sale.item_id,
            item_name: item.name || 'Unknown',
            quantity: sale.quantity,
            unit_price: sale.unit_price,
            total_price: sale.total_amount,
            commission_per_unit: commissionPerUnit,
            total_commission: totalCommission,
          },
        ],
      };
    });

    // Calculate commission by item
    const commissionByItem: Record<string, any> = {};
    sales.forEach((sale: any) => {
      const item = sale.items || {};
      const commissionPerUnit = item.commission || 0;
      const totalCommission = commissionPerUnit * sale.quantity;

      if (!commissionByItem[sale.item_id]) {
        commissionByItem[sale.item_id] = {
          item_id: sale.item_id,
          item_name: item.name || 'Unknown',
          category: item.category || 'Uncategorized',
          quantity_sold: 0,
          total_sales: 0,
          commission_per_unit: commissionPerUnit,
          total_commission: 0,
        };
      }

      commissionByItem[sale.item_id].quantity_sold += sale.quantity;
      commissionByItem[sale.item_id].total_sales += sale.total_amount;
      commissionByItem[sale.item_id].total_commission += totalCommission;
    });

    const totalCommission = receiptsWithCommission.reduce((sum, r) => sum + r.commission, 0);
    const totalSales = sales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);

    return NextResponse.json({
      staff,
      total_commission: totalCommission,
      total_sales: totalSales,
      total_items_sold: totalItemsSold,
      receipts: receiptsWithCommission,
      commission_by_item: Object.values(commissionByItem),
    });
  } catch (error: any) {
    console.error('❌ Error fetching staff commission details:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
