import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

export async function PUT(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { full_name, username, phone_number, store_location, email } = await req.json();
    
    // Update users table fields
    const dbUpdates: any = {};
    if (full_name !== undefined) dbUpdates.full_name = full_name;
    if (username !== undefined) dbUpdates.username = username;
    if (phone_number !== undefined) dbUpdates.phone_number = phone_number;
    if (store_location !== undefined) dbUpdates.store_location = store_location;

    // Update database
    const { data: user, error: dbError } = await supabaseAdmin
      .from('users')
      .update(dbUpdates)
      .eq('id', authResult.id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 400 });
    }

    // If email is being changed, update it in Supabase Auth as well
    if (email && email !== authResult.email) {
      // Verify new email is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }

      // Check if email is already taken
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', authResult.id)
        .single();

      if (existingUser) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }

      // Try to find the actual Supabase Auth user.
      // public.users.id may differ from auth.users.id for legacy/manually-created users.
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(authResult.id);

      if (authUserData?.user) {
        // User exists in Supabase Auth — sync the email there too
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(authUserData.user.id, {
          email: email,
        });
        if (authError) {
          return NextResponse.json({ error: `Failed to update email: ${authError.message}` }, { status: 400 });
        }
      }
      // Whether or not they exist in auth, always update the email in public.users
      await supabaseAdmin
        .from('users')
        .update({ email })
        .eq('id', authResult.id);
    }

    return NextResponse.json({ 
      user: { ...user, email: email || authResult.email },
      message: 'Profile updated successfully' 
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 400 });
  }
}
