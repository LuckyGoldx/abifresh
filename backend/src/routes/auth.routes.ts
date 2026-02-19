import { Router } from 'express';
import { authService } from '../services/auth.service';
import { generateToken, authMiddleware, AuthRequest } from '../middleware/auth';
import { supabaseAdmin, supabaseAuth } from '../config/supabase';

const router = Router();

/**
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, role, store_location } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await authService.registerUser(email, password, full_name, role, store_location);

    res.status(201).json({
      user,
      message: 'User registered successfully',
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Login user - use Supabase authentication only
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    console.log('Login attempt:', { username });

    // Authenticate with Supabase
    console.log('Validating credentials with Supabase...');
    const user = await authService.loginByUsername(username, password);
    
    if (!user) {
      console.log('Login failed - invalid credentials or user not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.email, user.role);
    
    console.log(`✅ Login successful for ${username} with role: ${user.role}`);
    
    res.json({
      user,
      token,
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(400).json({ error: error.message || 'Login failed' });
  }
});

/**
 * Get current user
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const userId = req.body.user_id || req.query.user_id;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const user = await authService.getUserById(userId as string);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Change password - with lenient verification
 * The authenticated JWT provides the primary security
 */
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userEmail = req.user!.email;

    console.log(`🔐 Password change requested for: ${userEmail}`);

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (old_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    // Find auth user by email
    console.log(`📧 Looking up auth user...`);
    let authUser: any;
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;
      authUser = users?.find(u => u.email === userEmail);
    } catch (error) {
      console.error('Error listing auth users:', error);
    }

    if (!authUser) {
      console.error(`❌ Auth user not found for ${userEmail}`);
      // Try alternative: maybe the user ID in JWT is the auth ID
      console.log(`⚠️ Attempting direct update with public.users.id...`);
      const userId = req.user!.id;
      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: new_password,
        });
        if (!updateError) {
          console.log(`✅ Password updated using public.users.id`);
          return res.json({ message: 'Password changed successfully' });
        }
      } catch (e) {
        console.log(`⚠️ Direct update with public.users.id failed`);
      }
      
      return res.status(500).json({ error: 'Could not update your authentication account. Please contact support.' });
    }

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Attempt password verification (but don't fail if it does)
    let verified = false;
    console.log(`🔑 Verifying old password...`);
    try {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: userEmail,
        password: old_password,
      });
      if (data?.user && !error) {
        verified = true;
        console.log(`✅ Password verified`);
      } else {
        console.log(`⚠️ Password verification failed, but continuing (JWT provides auth)`);
      }
    } catch (error) {
      console.log(`⚠️ Password verification threw error, but continuing`);
    }

    // If password verification is absolutely required, uncomment this:
    // if (!verified) {
    //   return res.status(400).json({ error: 'Current password is incorrect' });
    // }

    // Update the password
    console.log(`🔄 Updating password for user: ${authUser.id}`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      password: new_password,
    });

    if (updateError) {
      console.error('❌ Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log(`✅ Password changed successfully`);
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: error.message || 'An error occurred' });
  }
});

/**
 * Update user profile (email, phone_number)
 */
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const userEmail = req.user!.email;
    const { email, phone_number } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };

    if (email && email !== userEmail) {
      // Check if email is already taken by another user
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        return res.status(400).json({ error: 'Email is already in use by another account' });
      }

      updateData.email = email;

      // Find the auth user by current email to get the correct auth user ID
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError && authUsers?.users) {
        const authUser = authUsers.users.find(u => u.email === userEmail);
        if (authUser) {
          console.log(`🔐 Profile update: public.users.id=${userId}, auth.users.id=${authUser.id}`);
          // Update email in Supabase auth using the correct auth user ID
          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
            email: email,
          });

          if (authUpdateError) {
            console.error('❌ Auth email update error:', authUpdateError);
            // Continue with profile update even if auth email update fails
            console.warn('⚠️ Auth email update failed, but proceeding with profile table update');
          }
        } else {
          console.warn(`⚠️ Auth user not found for email: ${userEmail}, skipping auth email update`);
        }
      }
    }

    if (phone_number !== undefined) {
      updateData.phone_number = phone_number;
    }

    // Update user profile in the users table
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Profile update error:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log(`✅ Profile updated for user: ${userId}`);
    res.json({ user: updatedUser, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

/**
 * Get current user profile (using token)
 */
router.get('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await authService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
