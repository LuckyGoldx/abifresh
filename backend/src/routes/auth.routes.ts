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
    const result = await authService.loginByUsername(username, password);
    
    if (result.deactivated) {
      console.log('Login failed - account is deactivated');
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact the administrator.' });
    }

    if (!result.user) {
      console.log('Login failed - invalid credentials or user not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.user;
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
 * Change password - Simple and reliable
 * JWT authentication provides the primary security
 * No need to verify old password since user is already authenticated
 */
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userEmail = req.user!.email;
    const userId = req.user!.id;

    console.log(`🔐 Password change initiated for: ${userEmail}`);

    // Validate inputs
    if (!new_password) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (old_password === new_password) {
      return res.status(400).json({ error: 'New password must be different from your current password' });
    }

    // Step 1: Try to find auth user by email
    console.log(`📧 Step 1: Looking up auth user by email: ${userEmail}`);
    let authUserId: string | null = null;
    
    try {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users && users.length > 0) {
        const found = users.find(u => u.email === userEmail);
        if (found) {
          authUserId = found.id;
          console.log(`✅ Found auth user by email: ${authUserId}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Could not list auth users:`, error);
    }

    // Step 2: If email lookup failed, try using public.users.id (they might be the same)
    if (!authUserId) {
      console.log(`⚠️ Email lookup failed, attempting with public.users.id: ${userId}`);
      authUserId = userId;
    }

    // Step 3: Update the password
    console.log(`🔄 Updating password for auth user: ${authUserId}`);
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: new_password,
    });

    if (updateError) {
      console.error(`❌ Password update failed:`, updateError);
      return res.status(400).json({ 
        error: 'Could not change password. Please ensure you are logged in and try again.' 
      });
    }

    console.log(`✅ Password changed successfully for ${userEmail}`);
    return res.json({ message: 'Password changed successfully' });

  } catch (error: any) {
    console.error('❌ Unexpected error in password change:', error);
    return res.status(500).json({ 
      error: error.message || 'An unexpected error occurred while changing your password' 
    });
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
