import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { supabaseAdmin, supabaseAuth } from '@/lib/server/supabase-admin';

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { old_password, new_password } = await req.json();

    if (!old_password) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    if (!new_password) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }
    if (new_password.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }
    if (old_password === new_password) {
      return NextResponse.json({ error: 'New password must be different from current password' }, { status: 400 });
    }

    // Step 1: Determine the correct email for Supabase Auth sign-in.
    // Try getUserById first (works when public.users.id == auth.users.id).
    // Fall back to authResult.email if the IDs differ (common for manually-created accounts).
    let authEmail = authResult.email;
    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(authResult.id);
    if (authUserData?.user?.email) {
      authEmail = authUserData.user.email;
    }

    // Step 2: Verify old password using the auth user's email.
    // IMPORTANT: Return 400 (not 401) so the API interceptor does not auto-logout the user.
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: authEmail,
      password: old_password,
    });

    if (signInError || !signInData?.user) {
      // If signIn failed because no auth account exists at all, give a helpful message
      if (signInError?.message?.toLowerCase().includes('invalid login') || signInError?.message?.toLowerCase().includes('email not confirmed')) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      if (signInError?.message?.toLowerCase().includes('user not found') || signInError?.message?.toLowerCase().includes('no user found')) {
        return NextResponse.json(
          { error: 'Password change is not available for your account. Please contact an administrator.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    // Step 3: Update password using the confirmed auth user UUID.
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(signInData.user.id, {
      password: new_password,
    });

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ 
        error: updateError.message || 'Failed to update password' 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to change password' 
    }, { status: 400 });
  }
}
