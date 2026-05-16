import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data: creditor, error } = await supabaseAdmin.from('creditors').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: 'Creditor not found' }, { status: 404 });

  const [creditSales, creditPayments] = await Promise.all([
    supabaseAdmin.from('credit_sales').select('*').eq('creditor_id', params.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('credit_payments').select('*').eq('creditor_id', params.id).order('created_at', { ascending: false }),
  ]);

  const totalCredited = creditSales.data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0;
  const totalPaid = creditPayments.data?.filter(p => p.status === 'approved').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalQuantity = creditSales.data?.reduce((sum, s) => sum + Number(s.total_quantity), 0) || 0;

  return NextResponse.json({
    ...creditor,
    total_credited: totalCredited,
    total_paid: totalPaid,
    outstanding: totalCredited - totalPaid,
    total_quantity: totalQuantity,
    credit_sales: creditSales.data || [],
    payment_history: creditPayments.data || [],
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin', 'superadmin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json();
  const updates: any = {};
  if (body.full_name) updates.full_name = body.full_name.trim();
  if (body.phone_number !== undefined) updates.phone_number = body.phone_number?.trim() || null;
  if (body.email !== undefined) updates.email = body.email?.trim() || null;
  if (body.address !== undefined) updates.address = body.address?.trim() || null;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await supabaseAdmin.from('creditors').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from('credit_activities').insert({
    creditor_id: params.id,
    staff_id: authResult.id,
    action: 'CREDITOR_UPDATED',
    details: updates,
  });

  return NextResponse.json(data);
}
