import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

/**
 * POST /api/staff/payments/request
 * Staff requests payment with optional receipt file upload.
 * Handles multipart/form-data (file upload) or JSON.
 */
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    let amount: string | null = null;
    let payment_method: string | null = null;
    let reference_number: string | null = null;
    let notes: string | null = null;
    let items_paid_for: any[] = [];
    let receipt_url: string | null = null;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await req.formData();
      amount = formData.get('amount') as string;
      payment_method = formData.get('payment_method') as string;
      reference_number = formData.get('reference_number') as string | null;
      notes = formData.get('notes') as string | null;

      const itemsRaw = formData.get('items_paid_for') as string | null;
      if (itemsRaw) {
        try { items_paid_for = JSON.parse(itemsRaw); } catch {}
      }

      const receiptFile = formData.get('receipt') as File | null;
      if (receiptFile) {
        const { createClient } = await import('@supabase/supabase-js');
        const { supabaseAdmin: adminClient } = await import('@/lib/server/supabase-admin');

        const fileBuffer = Buffer.from(await receiptFile.arrayBuffer());
        const fileName = `receipt_${authResult.id}_${Date.now()}_${receiptFile.name}`;
        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from('payments')
          .upload(fileName, fileBuffer, { contentType: receiptFile.type });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = adminClient.storage
            .from('payments')
            .getPublicUrl(fileName);
          receipt_url = publicUrlData?.publicUrl || null;
        }
      }
    } else {
      // Handle JSON body
      const body = await req.json();
      amount = body.amount;
      payment_method = body.payment_method;
      reference_number = body.reference_number || null;
      notes = body.notes || null;
      items_paid_for = Array.isArray(body.items_paid_for) ? body.items_paid_for : [];
    }

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const validMethods = ['cash', 'online', 'bank_deposit', 'pos'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Valid payment method (cash/online/bank_deposit/pos) is required' },
        { status: 400 }
      );
    }

    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, phone_number')
      .eq('id', authResult.id)
      .single();

    // Auto-generate reference number for cash payments if not provided
    let finalRefNumber = reference_number;
    if (payment_method === 'cash' && !finalRefNumber) {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      finalRefNumber = `CASH-${dateStr}-${randomStr}`;
    }

    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .insert([
        {
          staff_id: authResult.id,
          staff_name: user?.full_name || authResult.email || 'Staff Member',
          staff_email: user?.email || authResult.email,
          staff_phone: user?.phone_number || null,
          amount: parseFloat(amount),
          payment_type: ['commission_staff', 'staff_commission', 'sales_staff', 'sales'].includes(authResult.role) ? 'commission' : ['non_commission_staff', 'staff_non_commission'].includes(authResult.role) ? 'salary' : 'other',
          payment_method,
          status: 'pending',
          reference_number: finalRefNumber,
          receipt_url,
          items_paid_for: items_paid_for.length > 0 ? items_paid_for : null,
          notes: notes || null,
          requested_date: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin']);
    if (admins && admins.length > 0) {
      await supabaseAdmin.from('notifications').insert(
        admins.map((a: any) => ({
          user_id: a.id,
          type: 'payment_request',
          title: '💸 New Payment Request',
          message: `${user?.full_name || 'Staff'} requested ₦${parseFloat(amount).toLocaleString()}`,
          is_read: false,
        }))
      );
    }

    return NextResponse.json({ payment: data, message: 'Payment request submitted' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
