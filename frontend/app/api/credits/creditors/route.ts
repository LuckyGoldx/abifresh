import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get('active') !== 'false';
  const isSalesStaff = authResult.role === 'sales' || authResult.role === 'sales_staff';

  // 1. Fetch Creditors
  let query = supabaseAdmin.from('creditors').select('*');
  if (activeOnly) query = query.eq('is_active', true);
  
  // IF Sales Staff, strictly show ONLY creditors they added
  if (isSalesStaff) {
    query = query.eq('added_by', authResult.id);
  }

  query = query.order('created_at', { ascending: false });

  const { data: creditors, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 2. Fetch sales and payments for calculations
  let salesQuery = supabaseAdmin.from('credit_sales').select('id, creditor_id, staff_id, total_amount, total_quantity, receipt_number, created_at, status');
  let paymentsQuery = supabaseAdmin.from('credit_payments').select('creditor_id, staff_id, amount, credit_sale_id').eq('status', 'approved');

  // IF Sales Staff, only fetch THEIR sales and payments to calculate THEIR outstanding
  if (isSalesStaff) {
    salesQuery = salesQuery.eq('staff_id', authResult.id);
    paymentsQuery = paymentsQuery.eq('staff_id', authResult.id);
  }

  const [salesRes, paymentsRes] = await Promise.all([salesQuery, paymentsQuery]);

  const allSales = salesRes.data || [];
  const allPayments = paymentsRes.data || [];

  // 3. Fetch items count per sale
  const saleIds = allSales.map(s => s.id);
  let countsMap: Record<string, number> = {};
  
  if (saleIds.length > 0) {
    const { data: itemsCounts } = await supabaseAdmin
      .from('credit_sale_items')
      .select('credit_sale_id')
      .in('credit_sale_id', saleIds);

    itemsCounts?.forEach(item => {
      countsMap[item.credit_sale_id] = (countsMap[item.credit_sale_id] || 0) + 1;
    });
  }

  const enhancedCreditors = creditors.map(c => {
    const creditorSales = allSales.filter(s => String(s.creditor_id) === String(c.id));
    const creditorPayments = allPayments.filter(p => String(p.creditor_id) === String(c.id));

    // 1. Lifetime Total Credit (All non-cancelled sales)
    const totalCreditAmount = creditorSales.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + Number(s.total_amount), 0);
    
    // 2. Lifetime Paid (Total money ever collected from this creditor)
    const totalPaid = creditorPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // 3. Outstanding (Remaining balance of all non-cancelled receipts)
    let outstanding = 0;
    const activeSales = creditorSales.filter(s => s.status !== 'cancelled');
    const activePayments = creditorPayments;
    activeSales.forEach(s => {
      const receiptPayments = creditorPayments.filter(p => p.credit_sale_id === s.id);
      const receiptPaid = receiptPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      outstanding += Math.max(0, Number(s.total_amount) - receiptPaid);
    });

    const totalQuantity = creditorSales.reduce((sum, s) => sum + Number(s.total_quantity), 0);

    // 4. Active Credit Quantity (Items currently with creditor - not paid, not returned)
    const activeCreditQuantity = activeSales.reduce((sum, s) => {
      const receiptPayments = activePayments.filter(p => p.credit_sale_id === s.id);
      const receiptPaid = receiptPayments.reduce((pSum, p) => pSum + Number(p.amount), 0);
      return sum + (receiptPaid < Number(s.total_amount) ? Number(s.total_quantity) : 0);
    }, 0);

    return {
      ...c,
      total_credit_amount: totalCreditAmount,
      total_quantity: totalQuantity,
      active_credit_quantity: activeCreditQuantity,
      total_paid: totalPaid,
      outstanding: outstanding,
      credit_sales: creditorSales.map(s => ({
        ...s,
        items_count: countsMap[s.id] || 0
      })).slice(0, 50)
    };
  });

  return NextResponse.json(enhancedCreditors);
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const full_name = body.full_name || body.fullName;
  const phone_number = body.phone_number || body.phoneNumber;
  const email = body.email;
  const address = body.address;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }

  // Check for duplicate phone number
  if (phone_number?.trim()) {
    const { data: existing } = await supabaseAdmin
      .from('creditors')
      .select('full_name, unique_code, phone_number')
      .eq('phone_number', phone_number.trim())
      .limit(1);
    
    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: `Duplicate phone number! "${existing[0].full_name}" (${existing[0].unique_code}) is already registered with this number.`
      }, { status: 409 });
    }
  }

  const prefix = 'CR';
  const { count } = await supabaseAdmin.from('creditors').select('*', { count: 'exact', head: true });
  const uniqueCode = `${prefix}${String((count || 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabaseAdmin.from('creditors').insert({
    unique_code: uniqueCode,
    full_name: full_name.trim(),
    phone_number: phone_number?.trim() || null,
    email: email?.trim() || null,
    address: address?.trim() || null,
    added_by: authResult.id,
  }).select().single();

  if (error) {
    if (error.message?.includes('unique_code')) {
      const { count: retryCount } = await supabaseAdmin.from('creditors').select('*', { count: 'exact', head: true });
      const retryCode = `${prefix}${String((retryCount || 0) + 1).padStart(5, '0')}`;
      const { data: retryData, error: retryError } = await supabaseAdmin.from('creditors').insert({
        unique_code: retryCode,
        full_name: full_name.trim(),
        phone_number: phone_number?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        added_by: authResult.id,
      }).select().single();
      if (retryError) return NextResponse.json({ error: retryError.message }, { status: 400 });
      return NextResponse.json(retryData, { status: 201 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  supabaseAdmin.from('credit_activities').insert({
    creditor_id: data.id,
    staff_id: authResult.id,
    action: 'CREDITOR_CREATED',
    details: { full_name, unique_code: uniqueCode },
  }).then(() => {}, () => {});

  // SEND NOTIFICATIONS
  try {
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);

    const notificationBatch: any[] = [];
    const staffName = authResult.full_name || 'A staff member';
    
    // Notify admins and superadmins
    if (admins) {
      admins.forEach(admin => {
        notificationBatch.push({
          user_id: admin.id,
          type: 'creditor_added',
          title: '👤 New Creditor Added',
          message: `${staffName} added a new creditor: ${full_name.trim()} (${uniqueCode}).`,
          is_read: false
        });
      });
    }

      // Notify the staff member
      notificationBatch.push({
        user_id: authResult.id,
        type: 'creditor_added_confirmation',
        title: '✅ Creditor Registered',
        message: `You have successfully registered ${full_name.trim()} as a new creditor.`,
        is_read: false,
        action_url: `/sales/manage-creditors`
      });

      if (notificationBatch.length > 0) {
        const { error: nError } = await supabaseAdmin.from('notifications').insert(notificationBatch);
        if (nError) console.error('Creditor notification error:', nError);
      }
    } catch (nError) {
      console.error('Notification processing error:', nError);
    }

  return NextResponse.json(data, { status: 201 });
}
