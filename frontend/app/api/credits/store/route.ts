import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { verifyAuth, hasRole } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';
    
    let query = supabaseAdmin
      .from('credit_store')
      .select(`
        *,
        creditors (full_name),
        credit_sale_items (
          unit_price,
          credit_sales (staff_id, receipt_number, status, created_at, users (full_name))
        )
      `);
    
    if (isSalesStaff) {
      // Get IDs of sales initiated by this staff
      const { data: staffSales } = await supabaseAdmin
        .from('credit_sales')
        .select('id')
        .eq('staff_id', authResult.id);
      
      const saleIds = staffSales?.map(s => s.id) || [];
      
      if (saleIds.length > 0) {
        query = query.in('credit_sale_id', saleIds);
      } else {
        return NextResponse.json([]); // No sales, no store items
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin', 'sales')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { items } = await req.json(); // Array of { id: credit_store_id, item_id: main_item_id, quantity: number }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    for (const entry of items) {
      const returnQty = Number(entry.quantity);
      // Ensure quantity is a multiple of 0.5 (physically returnable unit)
      if ((returnQty * 2) % 1 !== 0) {
        throw new Error(`Invalid return quantity: ${returnQty}. Only multiples of 0.5 can be returned.`);
      }

      // 1. Get current item inventory
      const { data: mainItem, error: fetchError } = await supabaseAdmin
        .from('items')
        .select('active_store_quantity, name')
        .eq('id', entry.item_id)
        .single();
      
      if (fetchError || !mainItem) {
        throw new Error(`Item ${entry.item_id} not found in inventory`);
      }

      // 2. Increment active_store_quantity directly
      const { error: invError } = await supabaseAdmin.from('items')
        .update({ active_store_quantity: Number(mainItem.active_store_quantity || 0) + Number(entry.quantity) })
        .eq('id', entry.item_id);
      
      if (invError) {
        throw new Error(`Failed to update inventory for item ${entry.item_id}: ${invError.message}`);
      }

      // 3. Update credit store status to 'returned'
      const { data: storeEntry } = await supabaseAdmin
        .from('credit_store')
        .select('*, creditors(full_name)')
        .eq('id', entry.id)
        .single();

      const { error: storeError } = await supabaseAdmin
        .from('credit_store')
        .update({ status: 'returned', updated_at: new Date().toISOString() })
        .eq('id', entry.id);
      
      if (storeError) {
        throw new Error(`Failed to update credit store status for entry ${entry.id}: ${storeError.message}`);
      }

      // 4. Log the activity with full details
      await supabaseAdmin.from('credit_activities').insert({
        staff_id: authResult.id,
        action: 'CREDIT_ITEM_RETURNED',
        details: { 
          item_id: entry.item_id, 
          item_name: mainItem.name,
          quantity: entry.quantity,
          creditor_name: (Array.isArray(storeEntry?.creditors) ? storeEntry?.creditors[0]?.full_name : (storeEntry?.creditors as any)?.full_name) || 'Unknown',
          credit_store_id: entry.id,
          success: true
        }
      }).then(() => {}, () => {});
    }

    // 5. SEND NOTIFICATIONS
    try {
      const { data: admins } = await supabaseAdmin
        .from('users')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      const notificationBatch: any[] = [];
      const staffName = authResult.full_name || 'A staff member';
      
      // Notify admins and superadmins with ONE summary notification
      if (admins && items.length > 0) {
        admins.forEach(admin => {
          notificationBatch.push({
            user_id: admin.id,
            type: 'credit_item_returned',
            title: '🔄 Credit Items Returned',
            message: `${staffName} returned ${items.length} item(s) from the credit store back to the active inventory.`,
            is_read: false
          });
        });
      }

      // Notify the staff member who did the return
      notificationBatch.push({
        user_id: authResult.id,
        type: 'credit_return_confirmation',
        title: '✅ Return Successful',
        message: `You have successfully returned ${items.length} item(s) from the credit store to the active inventory.`,
        is_read: false,
        action_url: `/sales/credit-store`
      });

      if (notificationBatch.length > 0) {
        const { error: nError } = await supabaseAdmin.from('notifications').insert(notificationBatch);
        if (nError) console.error('Store notification error:', nError);
      }
    } catch (nError) {
      console.error('Notification processing error:', nError);
    }

    // 6. Fetch and return the updated store list to ensure sync
    const { data: updatedStore, error: refreshError } = await supabaseAdmin
      .from('credit_store')
      .select(`
        *,
        creditors (full_name),
        credit_sale_items (
          unit_price,
          credit_sales (receipt_number, status)
        )
      `)
      .order('created_at', { ascending: false });

    if (refreshError) throw refreshError;

    return NextResponse.json({ 
      message: 'Items returned successfully',
      updatedStore: (updatedStore || []).filter((item: any) => item.status !== 'paid')
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
