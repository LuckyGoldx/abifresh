import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import sharp from 'sharp';

/**
 * Compress image receipt to WebP format with optimized quality
 * Keeps PDFs uncompressed. Returns compressed buffer and new filename.
 */
async function compressReceipt(file: File): Promise<{ buffer: Buffer; fileName: string; type: string }> {
  const isImage = file.type.startsWith('image/');
  const isPDF = file.type === 'application/pdf';

  if (isPDF) {
    // Keep PDFs as-is
    const buffer = Buffer.from(await file.arrayBuffer());
    return { buffer, fileName: file.name, type: file.type };
  }

  if (!isImage) {
    throw new Error('Only images and PDFs are supported');
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Compress to WebP with 80 quality for imperceptible quality loss
    const compressed = await sharp(buffer)
      .webp({ quality: 80 })
      .toBuffer();

    // If compressed is smaller, use it; otherwise use original
    const finalBuffer = compressed.length < buffer.length ? compressed : buffer;
    
    // Generate filename with .webp extension
    const newFileName = file.name.replace(/\.[^.]+$/, '.webp');
    
    return { buffer: finalBuffer, fileName: newFileName, type: 'image/webp' };
  } catch (error) {
    // Fallback: return original file if compression fails
    const buffer = Buffer.from(await file.arrayBuffer());
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
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowed.includes(receiptFile.type)) {
        return NextResponse.json({ error: 'Receipt must be JPEG, PNG, WebP, or PDF' }, { status: 400 });
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

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('staff_payments')
      .insert([{
        staff_id: authResult.id,
        staff_name,
        amount,
        payment_method,
        payment_type: 'commission',
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
