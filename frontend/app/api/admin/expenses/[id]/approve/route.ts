import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { id } = params;
    const { notes } = await req.json();

    // 1. Fetch current expense
    const { data: expense, error: fetchError } = await supabaseAdmin
      .from('staff_expenses')
      .select('staff_id, expense_amount, expense_category, description')
      .eq('id', id)
      .single();

    if (fetchError || !expense) {
      return NextResponse.json({ error: `Expense not found: ${fetchError?.message || 'Unknown error'}` }, { status: 404 });
    }

    // Append admin notes to description if provided
    let finalDescription = expense.description || '';
    if (notes && notes.trim().length > 0) {
      finalDescription = `${finalDescription}\n\n[Admin Note]: ${notes.trim()}`;
    }

    // 2. Update expense status to approved
    const { error: updateError } = await supabaseAdmin
      .from('staff_expenses')
      .update({ 
        status: 'approved', 
        approved_date: new Date().toISOString(), 
        approved_by: authResult.id,
        description: finalDescription
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Get admin user info if possible for notification message
    let adminName = 'Admin';
    if (authResult.id) {
      const { data: adminUser } = await supabaseAdmin
        .from('users')
        .select('full_name')
        .eq('id', authResult.id)
        .single();
      if (adminUser?.full_name) adminName = adminUser.full_name;
    }

    // 3. Update existing notifications of type 'expense_request' for this expense
    const { data: existingNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, message')
      .eq('type', 'expense_request')
      .like('action_url', `%${id}%`);

    if (existingNotifications && existingNotifications.length > 0) {
      await Promise.all(existingNotifications.map(notification => {
        const originalMsg = notification.message || '';
        const cleanMsg = originalMsg.replace(/\(Pending\)/g, '').replace(/Pending/g, '').trim();
        const updatedMessage = `${cleanMsg} (Approved by ${adminName})`;
        
        return supabaseAdmin
          .from('notifications')
          .update({
            title: '💸 Expense Approved',
            message: updatedMessage
          })
          .eq('id', notification.id);
      }));
    }

    // 4. Create new notification for the staff member
    await supabaseAdmin.from('notifications').insert([
      {
        user_id: expense.staff_id,
        type: 'expense_approved',
        title: '✅ Expense Approved',
        message: `Your expense request of ₦${expense.expense_amount?.toLocaleString() || '0'} for ${expense.expense_category} has been approved. ${notes ? `Admin Note: ${notes}` : ''}`,
        is_read: false,
      },
    ]);

    return NextResponse.json({ message: 'Expense approved successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
