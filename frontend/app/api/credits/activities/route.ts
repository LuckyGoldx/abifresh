import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';
    let query = supabaseAdmin
      .from('credit_activities')
      .select('*, creditors(full_name), staff:staff_id(full_name)');
    
    if (isSalesStaff) {
      query = query.eq('staff_id', authResult.id);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const enriched = (data || []).map((a: any) => {
      let details = a.details || {};
      
      // Safety: if details was stored as a JSON string (from old backup corruption), parse it
      if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch { details = {}; }
      }
      // Safety: ensure numeric fields are actually numbers, not formatted strings
      if (details.amount && typeof details.amount === 'string') {
        details.amount = parseFloat(details.amount.replace(/[^0-9.-]/g, '')) || 0;
      }
      if (details.total_amount && typeof details.total_amount === 'string') {
        details.total_amount = parseFloat(details.total_amount.replace(/[^0-9.-]/g, '')) || 0;
      }
      if (details.quantity && typeof details.quantity === 'string') {
        details.quantity = parseFloat(details.quantity.replace(/[^0-9.-]/g, '')) || 0;
      }
      if (details.items_paid_count && typeof details.items_paid_count === 'string') {
        details.items_paid_count = parseInt(details.items_paid_count.replace(/[^0-9]/g, ''), 10) || 0;
      }
      
      // TRIGGER BACKGROUND ENRICHMENT ONLY IF NEEDED
      // We don't await this so the API stays lightning fast
      if (a.action === 'CREDIT_ITEM_RETURNED' && (!details.item_name || details.item_name === 'items' || !details.creditor_name)) {
        (async () => {
          try {
            const [itemRes, storeRes] = await Promise.all([
              details.item_id ? supabaseAdmin.from('items').select('name').eq('id', details.item_id).single() : Promise.resolve({ data: null }),
              details.credit_store_id ? supabaseAdmin.from('credit_store').select('creditors(full_name)').eq('id', details.credit_store_id).single() : Promise.resolve({ data: null })
            ]);
            
            const updatedDetails = {
              ...details,
              item_name: itemRes.data?.name || details.item_name || 'Item',
              creditor_name: (Array.isArray(storeRes.data?.creditors) ? storeRes.data?.creditors[0]?.full_name : (storeRes.data?.creditors as any)?.full_name) || details.creditor_name || 'Creditor'
            };
            
            await supabaseAdmin.from('credit_activities').update({ details: updatedDetails }).eq('id', a.id);
          } catch (e) {
            // Background task failure is ignored to keep API stable
          }
        })();
      }

      return {
        ...a,
        details, // ENSURE DETAILS ARE RETURNED FOR THE MODAL
        creditor_name: a.creditors?.full_name || details.creditor_name || details.full_name || 'Unknown',
        staff_name: a.staff?.full_name || 'System',
      };
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
