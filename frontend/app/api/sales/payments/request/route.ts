import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
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

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
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

    const validPaymentMethods = ['cash', 'online', 'bank_deposit', 'pos'];
    if (!payment_method || !validPaymentMethods.includes(payment_method)) {
      return NextResponse.json(
        { error: 'Valid payment method (cash/online/bank_deposit/pos) is required' },
        { status: 400 }
      );
    }

    let items_paid_for: any[] = [];
    if (items_paid_for_raw) {
      try {
        items_paid_for = JSON.parse(items_paid_for_raw);
      } catch {
        return NextResponse.json({ error: 'Invalid items_paid_for format' }, { status: 400 });
      }
    }

    // Upload receipt if provided
    let receipt_url: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
      if (!allowed.includes(receiptFile.type)) {
        return NextResponse.json({ error: 'Receipt must be JPEG, PNG, GIF, WebP, or PDF' }, { status: 400 });
      }
      if (receiptFile.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'Receipt must be less than 10MB' }, { status: 400 });
      }

      try {
        // Compress receipt before uploading
        const { buffer: fileData, fileName: compressedName, type: compressedType } = await compressReceipt(receiptFile);
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${compressedName}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('payments')
          .upload(fileName, fileData, { contentType: compressedType, upsert: true });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabaseAdmin.storage.from('payments').getPublicUrl(uploadData.path);
          receipt_url = urlData?.publicUrl || null;
        }
      } catch (uploadErr) {
        console.error('Receipt upload failed:', uploadErr);
        // Continue without receipt URL - don't block payment submission
      }
    }

    // Auto-generate reference number if not provided
    const ref_number = reference_number ||
      `PYMT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // ─── Duplicate guard ────────────────────────────────────────────────────
    // Reject the request if this staff member already submitted a payment for
    // the exact same amount within the last 60 seconds that is still pending
    // or approved.  This prevents accidental double-clicks / double-submissions.
    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentDuplicates, error: dupCheckError } = await supabaseAdmin
      .from('staff_payments')
      .select('id, amount, status, created_at')
      .eq('staff_id', authResult.id)
      .eq('amount', amount)
      .in('status', ['pending', 'approved'])
      .gte('created_at', sixtySecondsAgo);

    if (dupCheckError) {
      // Log but don't block — let the insert proceed if the check itself fails
      console.error('⚠️ Duplicate check query failed:', dupCheckError.message);
    } else if (recentDuplicates && recentDuplicates.length > 0) {
      return NextResponse.json(
        {
          error:
            `A payment of ₦${amount.toLocaleString()} was already submitted ${Math.round((Date.now() - new Date(recentDuplicates[0].created_at).getTime()) / 1000)} seconds ago and is currently ${recentDuplicates[0].status}. ` +
            `Please check your payment history before resubmitting. If you believe this is an error, wait a moment and try again.`,
        },
        { status: 409 }
      );
    }
    // ────────────────────────────────────────────────────────────────────────



    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('staff_payments')
      .insert([{
        staff_id: authResult.id,
        staff_name,
        amount,
        payment_method,
        payment_type: 'sale',
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

    // Notify admins
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .in('role', ['admin', 'superadmin'])
      .eq('is_active', true);

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        user_id: admin.id,
        type: 'payment_request',
        title: 'New Payment Request',
        message: `${staff_name} has submitted a payment request for ₦${amount.toLocaleString()}`,
        is_read: false,
      }));

      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      payment,
      message: 'Payment request submitted successfully',
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit payment request' }, { status: 400 });
  }
}
