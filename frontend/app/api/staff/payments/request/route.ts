import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

/**
 * Compress image receipt to WebP format.
 * Uses dynamic sharp import to avoid module-level load failure on some platforms.
 */
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
    // Compressed is larger — keep original
    return { buffer, fileName: file.name, type: file.type };
  } catch {
    return { buffer, fileName: file.name, type: file.type };
  }
}

/**
 * POST /api/staff/payments/request
 */
export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    // Always parse as FormData — frontend always sends multipart/form-data
    const formData = await req.formData();
    const amount = formData.get('amount') as string;
    const payment_method = formData.get('payment_method') as string;
    const reference_number = (formData.get('reference_number') as string) || null;
    const notes = (formData.get('notes') as string) || null;

    const itemsRaw = formData.get('items_paid_for') as string | null;
    let items_paid_for: any[] = [];
    if (itemsRaw) {
      try { items_paid_for = JSON.parse(itemsRaw); } catch {}
    }

    if (!amount || isNaN(parseFloat(amount))) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const validMethods = ['cash', 'online', 'bank_deposit', 'pos'];
    if (!payment_method || !validMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Valid payment method (cash/online/bank_deposit/pos) is required' },
        { status: 400 }
      );
    }

    // Upload receipt if present
    let receipt_url: string | null = null;
    const receiptFile = formData.get('receipt') as File | null;
    if (receiptFile && receiptFile.size > 0) {
      try {
        const { buffer: fileBuffer, fileName: compressedName, type: compressedType } = await compressReceipt(receiptFile);
        const fileName = `receipt_${authResult.id}_${Date.now()}_${compressedName}`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('payments')
          .upload(fileName, fileBuffer, { contentType: compressedType });
        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabaseAdmin.storage.from('payments').getPublicUrl(fileName);
          receipt_url = publicUrlData?.publicUrl || null;
        }
      } catch (uploadErr) {
        console.error('Receipt upload failed:', uploadErr);
        // Non-fatal: continue without receipt URL
      }
    }

    // Get user info
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('full_name, email, phone_number')
      .eq('id', authResult.id)
      .single();

    // Auto-generate reference number for cash payments
    let finalRefNumber = reference_number;
    if (payment_method === 'cash' && !finalRefNumber) {
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      finalRefNumber = `CASH-${dateStr}-${randomStr}`;
    }

    const paymentType = ['commission_staff', 'staff_commission', 'sales_staff', 'sales'].includes(authResult.role)
      ? 'commission'
      : ['non_commission_staff', 'staff_non_commission'].includes(authResult.role)
        ? 'salary'
        : 'other';

    const { data, error } = await supabaseAdmin
      .from('staff_payments')
      .insert([{
        staff_id: authResult.id,
        staff_name: user?.full_name || authResult.email || 'Staff Member',
        staff_email: user?.email || authResult.email,
        staff_phone: user?.phone_number || null,
        amount: parseFloat(amount),
        payment_type: paymentType,
        payment_method,
        status: 'pending',
        reference_number: finalRefNumber,
        receipt_url,
        items_paid_for: items_paid_for.length > 0 ? items_paid_for : null,
        notes: notes || null,
        requested_date: new Date().toISOString(),
      }])
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
    console.error('Staff payment POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process payment request' }, { status: 400 });
  }
}
