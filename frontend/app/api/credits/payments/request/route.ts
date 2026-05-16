import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

async function compressReceipt(file: File): Promise<{ buffer: Buffer; fileName: string; type: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.type === 'application/pdf' || !file.type.startsWith('image/')) {
    return { buffer, fileName: file.name, type: file.type };
  }
  try {
    const sharp = (await import('sharp')).default;
    const compressed = await sharp(buffer).resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
    if (compressed.length < buffer.length) {
      const newFileName = file.name.replace(/\.[^.]+$/, '.webp');
      return { buffer: compressed, fileName: newFileName, type: 'image/webp' };
    }
    return { buffer, fileName: file.name, type: file.type };
  } catch {
    return { buffer, fileName: file.name, type: file.type };
  }
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const amount = parseFloat(formData.get('amount') as string);
    const staff_name = formData.get('staff_name') as string;
    const items_paid_for_raw = formData.get('items_paid_for') as string;
    const reference_number = (formData.get('reference_number') as string) || null;
    const payment_method = formData.get('payment_method') as string;
    const notes = (formData.get('notes') as string) || null;
    const receiptFile = formData.get('receipt') as File | null;

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
    }

    let items_paid_for: any[] = [];
    if (items_paid_for_raw) {
      try {
        items_paid_for = JSON.parse(items_paid_for_raw);
      } catch {
        return NextResponse.json({ error: 'Invalid items format' }, { status: 400 });
      }
    }

    if (items_paid_for.length === 0) {
      return NextResponse.json({ error: 'You must select at least one collected payment to remit' }, { status: 400 });
    }

    // Extract original credit_payment IDs so we can mark them as submitted
    const creditPaymentIds = items_paid_for.map(item => item.credit_payment_id).filter(Boolean);

    // Upload receipt if provided
    let receipt_url: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      try {
        const { buffer: fileData, fileName: compressedName, type: compressedType } = await compressReceipt(receiptFile);
        const fileName = `credit-remittances/${Date.now()}-${Math.random().toString(36).substring(7)}-${compressedName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('payments')
          .upload(fileName, fileData, { contentType: compressedType, upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabaseAdmin.storage.from('payments').getPublicUrl(uploadData.path);
          receipt_url = urlData?.publicUrl || null;
        }
      } catch (uploadErr) {
        console.error('Receipt upload failed:', uploadErr);
      }
    }

    const ref_number = reference_number ||
      `CR-RM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 1. Insert into staff_payments as a credit_remittance
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('staff_payments')
      .insert([{
        staff_id: authResult.id,
        staff_name,
        amount,
        payment_method,
        payment_type: 'credit_remittance',
        status: 'pending',
        reference_number: ref_number,
        notes,
        receipt_url,
        items_paid_for,
        requested_date: new Date().toISOString(),
      }])
      .select()
      .single();

    if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 400 });

    // 2. Mark the underlying credit_payments as submitted
    if (creditPaymentIds.length > 0) {
      await supabaseAdmin.from('credit_payments')
        .update({ remittance_status: 'submitted' })
        .in('id', creditPaymentIds);
    }

    // 3. Notify admins
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin'])
      .eq('is_active', true);

    if (admins && admins.length > 0) {
      const { data: adminRoles } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .in('id', admins.map((a: any) => a.id));

      const notifications = (adminRoles || []).map((admin: any) => ({
        user_id: admin.id,
        type: 'credit_payment',
        title: 'New Credit Remittance Request',
        message: `${staff_name} submitted a credit remittance of ₦${amount.toLocaleString()} for approval.`,
        is_read: false,
        action_url: admin.role === 'superadmin' ? '/superadmin/credit-payments' : '/admin/credit-payments'
      }));
      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      payment,
      message: 'Credit payment remittance submitted successfully',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit' }, { status: 400 });
  }
}
