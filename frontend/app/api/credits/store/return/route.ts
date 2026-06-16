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
    const { items } = await req.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items to return' }, { status: 400 });
    }

    for (const item of items) {
      const { data: storeItem } = await supabaseAdmin.from('credit_store').select('*').eq('id', item.id).single();
      if (!storeItem) continue;
      if (storeItem.status === 'returned' || storeItem.status === 'paid') continue;

      const returnQty = Number(item.quantity) || Number(storeItem.quantity);

      // Fetch credit_sale_item to validate return quantity against 75% rule
      const { data: saleItem } = await supabaseAdmin
        .from('credit_sale_items')
        .select('quantity, quantity_paid')
        .eq('id', storeItem.credit_sale_item_id)
        .single();
      
      if (saleItem) {
        const totalQty = Number(saleItem.quantity);
        const paidQty = Number(saleItem.quantity_paid || 0);
        const paidPercentage = totalQty > 0 ? (paidQty / totalQty) * 100 : 0;
        const unpaid = totalQty - paidQty;
        const maxReturnable = Math.round(unpaid * 2) / 2;
        const blocked = (maxReturnable === 0.5 && paidPercentage > 75);
        
        if (blocked) {
          return NextResponse.json({ 
            error: `Cannot return. Only 0.5 unpaid and ${Math.round(paidPercentage)}% already paid.` 
          }, { status: 400 });
        }
        
        if (returnQty > maxReturnable) {
          return NextResponse.json({ 
            error: `Cannot return ${returnQty}. Maximum returnable is ${maxReturnable}.` 
          }, { status: 400 });
        }
      }

      await supabaseAdmin.from('credit_store')
        .update({ status: 'returned', quantity: storeItem.quantity - returnQty })
        .eq('id', item.id);

      const { data: currentItem } = await supabaseAdmin.from('items').select('active_store_quantity').eq('id', storeItem.item_id).single();
      const newQty = (currentItem?.active_store_quantity || 0) + returnQty;
      await supabaseAdmin.from('items').update({ active_store_quantity: newQty }).eq('id', storeItem.item_id);
    }

    return NextResponse.json({ message: 'Items returned successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
