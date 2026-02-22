'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { User, Lock, Eye, EyeOff, Database, CheckCircle, XCircle } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  // Check for deactivated account redirect
  useEffect(() => {
    if (searchParams.get('deactivated') === 'true') {
      setError('Your account has been deactivated. Please contact the administrator.');
    }
  }, [searchParams]);

  // Check Supabase connection on mount
  useEffect(() => {
    checkSupabaseConnection();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      const response = await api.get('/health');
      if (response.data.database?.supabase === 'CONNECTED') {
        setSupabaseStatus('connected');
      } else {
        setSupabaseStatus('disconnected');
      }
    } catch (error) {
      setSupabaseStatus('disconnected');
    }
  };

  // Removed auto-redirect useEffect - handleLogin already does role-based redirect

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      console.log('Login attempt:', username);
      
      // Call backend login endpoint
      const response = await api.post('/api/auth/login', { username, password });
      const { user, token } = response.data;

      console.log('Login successful:', { user, role: user?.role });

      setUser(user);
      setToken(token);

      // Redirect based on role
      const role = user?.role || 'admin';
      console.log('Redirecting with role:', role);
      
      switch (role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'sales':
        case 'sales_staff':
          router.push('/sales/dashboard');
          break;
        case 'staff_commission':
        case 'commission_staff':
        case 'staff_non_commission':
        case 'non_commission_staff':
          router.push('/staff/dashboard');
          break;
        default:
          console.warn('Unknown role, redirecting to admin dashboard:', role);
          router.push('/admin/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-pink-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md">
        {/* Supabase Connection Status */}
        <div className={`mb-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
          supabaseStatus === 'connected' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : supabaseStatus === 'disconnected'
            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
        }`}>
          <Database className="w-4 h-4" />
          <span className="text-sm font-medium">
            {supabaseStatus === 'connected' && (
              <>
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Connected to Supabase Database
              </>
            )}
            {supabaseStatus === 'disconnected' && (
              <>
                <XCircle className="w-4 h-4 inline mr-1" />
                Database Connection Failed
              </>
            )}
            {supabaseStatus === 'checking' && 'Checking Database Connection...'}
          </span>
        </div>

        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-block bg-pink-500 text-white rounded-full p-4 mb-4">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            ABIFRESH
          </h1>
          <p className="text-gray-600 dark:text-gray-400">& KIDDIES VENTURES</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            Login to Your Account
          </h2>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your username"
                  className="input pl-12 w-full"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-12 pr-12 w-full"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-600 dark:text-gray-400 text-sm mt-6">
          © 2026 ABIFRESH & KIDDIES VENTURES. All rights reserved.
        </p>
      </div>
    </div>
  );
}
