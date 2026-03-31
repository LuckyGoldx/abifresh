import { createClient } from '@supabase/supabase-js';

// These are validated at request time (inside route handlers), not build time.
// Throwing at module level causes Next.js build to fail when env vars aren't
// available in the build environment (e.g. Vercel build phase).
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Server-side Supabase admin client (uses service role key).
 * NEVER expose this to the browser - only import in API routes (server-side).
 */
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder',
  {
    db: { schema: 'public' },
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

/**
 * Supabase auth client (uses anon key) - for password verification
 */
export const supabaseAuth = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);
