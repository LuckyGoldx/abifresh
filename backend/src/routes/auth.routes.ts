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
 * Change password - requires old password verification
 */
router.post('/change-password', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Verify old password by attempting to sign in with Supabase
    const { error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: userEmail,
      password: old_password,
    });

    if (signInError) {
      console.log(`❌ Password change failed - old password incorrect for user: ${userEmail}`);
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password using Supabase admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: new_password,
    });

    if (updateError) {
      console.error('❌ Password update error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    console.log(`✅ Password changed successfully for user: ${userEmail}`);
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

/**
 * Update user profile (email, phone_number)
 */
router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { email, phone_number } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };

    if (email) {
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

      // Also update email in Supabase auth
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: email,
      });

      if (authUpdateError) {
        console.error('❌ Auth email update error:', authUpdateError);
        return res.status(500).json({ error: 'Failed to update email in authentication system' });
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
