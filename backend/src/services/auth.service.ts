import { supabaseAdmin, supabaseAuth } from '../config/supabase';
import { User } from '../types';
import { localhostAuthService } from './localhost-auth.service';

export class AuthService {
  /**
   * Register a new user
   */
  async registerUser(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'sales' | 'sales_staff' | 'staff_commission' | 'commission_staff' | 'staff_non_commission' | 'non_commission_staff',
    storeLocation: string = 'Jalingo',
    customUsername?: string,
    phoneNumber?: string
  ): Promise<User> {
    // Create auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Use custom username if provided, otherwise generate from email
    const username = customUsername || this.generateUsernameFromEmail(email);

    // Build insert data
    const insertData: any = {
      id: authUser.user.id,
      email,
      full_name: fullName,
      username,
      role,
      is_active: true,
      store_location: storeLocation,
    };

    // Include phone_number if provided
    if (phoneNumber) {
      insertData.phone_number = phoneNumber;
    }

    // Create user profile
    const { data: user, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([insertData])
      .select()
      .single();

    if (profileError) throw profileError;

    return user;
  }

  /**
   * Login user with email and password
   * Uses Supabase authentication only
   */
  async login(email: string, password: string): Promise<User | null> {
    try {
      console.log(`🔐 Login attempt for: ${email}`);
      
      // Authenticate with Supabase
      console.log('Authenticating with Supabase...');
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) {
        console.log(`❌ Supabase auth failed: ${authError.message}`);
        return null;
      }

      if (!authData.user) {
        console.log('❌ No user data returned from Supabase');
        return null;
      }

      console.log(`✅ Supabase auth successful for user: ${authData.user.id}`);
      
      // Get user profile from database
      const user = await this.getUserByEmail(email);
      
      if (!user) {
        console.log(`❌ User profile not found in database: ${email}`);
        return null;
      }

      console.log(`✅ User profile retrieved: ${user.id}, role: ${user.role}`);
      return user;
      
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Get user by username (case-insensitive)
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('username', username)  // ilike is case-insensitive
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Login user by username and password (case-insensitive)
   */
  async loginByUsername(username: string, password: string): Promise<{ user: User | null; deactivated?: boolean }> {
    try {
      console.log(`🔐 Login attempt for username: ${username}`);
      
      // First try localhost auth (for demo users and superadmin)
      console.log('Trying localhost auth first...');
      const localhostResult = await localhostAuthService.loginByUsername(username, password);
      if (localhostResult.user) {
        console.log(`✅ Localhost auth successful for user: ${localhostResult.user.username}`);
        return localhostResult;
      }
      
      // If localhost auth fails, continue with Supabase auth
      console.log('Localhost auth failed, trying Supabase...');
      
      // Get user by username (case-insensitive)
      const user = await this.getUserByUsername(username);
      if (!user) {
        console.log(`❌ User not found: ${username}`);
        return { user: null };
      }

      console.log(`✅ User found: ${user.email}, username: ${user.username}`);

      // Check if user account is deactivated
      if (!user.is_active) {
        console.log(`🚫 User account is deactivated: ${username}`);
        return { user: null, deactivated: true };
      }
      
      // Authenticate with Supabase using email and password
      console.log('Authenticating with Supabase...');
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
        email: user.email,
        password,
      });
      
      if (authError) {
        console.log(`❌ Supabase auth failed: ${authError.message}`);
        return { user: null };
      }

      if (!authData.user) {
        console.log('❌ No user data returned from Supabase');
        return { user: null };
      }

      console.log(`✅ Supabase auth successful for user: ${authData.user.id}`);
      return { user };
      
    } catch (error: any) {
      console.error('❌ Login error:', error.message);
      return { user: null };
    }
  }

  /**
   * Generate username from email (lowercase, replace dots with underscores)
   */
  generateUsernameFromEmail(email: string): string {
    return email.split('@')[0].replace(/\./g, '_').toLowerCase();
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Update user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string): Promise<void> {
    await supabaseAdmin.from('users').update({ is_active: false }).eq('id', id);
  }

  /**
   * Get all users with specific role
   */
  async getUsersByRole(
    role: 'admin' | 'sales' | 'staff_commission' | 'staff_non_commission'
  ): Promise<User[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', role)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  }
}

export const authService = new AuthService();
