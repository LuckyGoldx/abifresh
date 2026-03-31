import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('staff_expenses')
    .select('*')
    .eq('staff_id', authResult.id)
    .order('expense_date', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Map DB columns back to frontend-friendly names
  const expenses = (data || []).map((exp: any) => ({
    id: exp.id,
    staff_id: exp.staff_id,
    expense_type: exp.expense_category,
    amount: exp.expense_amount,
    description: exp.description,
    expense_date: exp.expense_date,
    created_at: exp.created_at,
  }));

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!hasRole(authResult.role, 'sales', 'sales_staff', 'admin')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { expense_type, amount, description, expense_date } = await req.json();

    if (!expense_type || !amount) {
      return NextResponse.json({ error: 'expense_type and amount are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('staff_expenses')
      .insert({
        staff_id: authResult.id,
        expense_category: expense_type,
        expense_amount: parseFloat(amount.toString()),
        description: description || null,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json(
      {
        expense: {
          ...data,
          expense_type: data.expense_category,
          amount: data.expense_amount,
        },
        message: 'Expense recorded successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
