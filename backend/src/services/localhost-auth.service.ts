import { User } from '../types';

/**
 * Demo/Localhost Auth Service
 * Use this for local development and testing
 * In production, this will be replaced with Supabase auth
 */

export const DEMO_USERS = {
  admin: {
    id: 'admin-001',
    email: 'admin@abifresh.com',
    username: 'admin',
    password: 'admin123',
    full_name: 'Admin User',
    role: 'admin' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  salesperson_1: {
    id: 'sales-001',
    email: 'sales@abifresh.com',
    username: 'sales',
    password: 'sales123',
    full_name: 'John Salesman',
    role: 'sales' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  salesperson_2: {
    id: 'sales-002',
    email: 'seller@abifresh.com',
    username: 'seller',
    password: 'seller123',
    full_name: 'Mary Seller',
    role: 'sales' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  commission_staff: {
    id: 'staff-001',
    email: 'staff.comm@abifresh.com',
    username: 'staffcomm',
    password: 'staffcomm123',
    full_name: 'David Staff (Commission)',
    role: 'commission_staff' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  non_commission_staff: {
    id: 'staff-002',
    email: 'staff@abifresh.com',
    username: 'staff',
    password: 'staff123',
    full_name: 'Sarah Staff (No Commission)',
    role: 'non_commission_staff' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  finance: {
    id: 'finance-001',
    email: 'finance@abifresh.com',
    username: 'finance',
    password: 'finance123',
    full_name: 'Finance User',
    role: 'admin' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  superadmin: {
    id: 'superadmin-001',
    email: 'lucky@abifresh.com',
    username: 'lucky',
    password: '#ebuka5788',
    full_name: 'Lucky - Superadmin',
    role: 'superadmin' as const,
    is_active: true,
    store_location: 'Jalingo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export class LocalhostAuthService {
  /**
   * Login with demo credentials
   */
  async login(email: string, password: string): Promise<User | null> {
    // Find user by email and password
    const user = Object.values(DEMO_USERS).find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Get user by username (case-insensitive)
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const user = Object.values(DEMO_USERS).find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Login user by username and password (case-insensitive)
   */
  async loginByUsername(username: string, password: string): Promise<{ user: User | null; deactivated?: boolean }> {
    // Find user by username (case-insensitive) and password
    const user = Object.values(DEMO_USERS).find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return { user: null };
    }

    // Check if user account is deactivated
    if (!user.is_active) {
      return { user: null, deactivated: true };
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword as User };
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = Object.values(DEMO_USERS).find((u) => u.email === email);

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const user = Object.values(DEMO_USERS).find((u) => u.id === userId);

    if (!user) {
      return null;
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  /**
   * Get all demo users (for testing/debugging)
   */
  getAllDemoUsers(): User[] {
    return Object.values(DEMO_USERS).map(({ password: _, ...user }) => user as User);
  }

  /**
   * Register new user (localhost version - just validates and returns)
   */
  async registerUser(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'sales' | 'staff_commission' | 'staff_non_commission',
    storeLocation: string = 'Jalingo'
  ): Promise<User> {
    const now = new Date().toISOString();
    const username = email.split('@')[0].replace(/\./g, '_').toLowerCase();
    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName,
      username,
      phone_number: undefined,
      role,
      is_active: true,
      store_location: storeLocation,
      created_at: now,
      updated_at: now,
    };

    return newUser;
  }
}

export const localhostAuthService = new LocalhostAuthService();
