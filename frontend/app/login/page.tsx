'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useThemeStore } from '@/store/auth';
import { User, Lock, Eye, EyeOff, X, Sun, Moon } from 'lucide-react';
import api from '@/lib/api';
import styles from './login.module.css';
import InstallButton from '@/components/InstallButton';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const isDarkMode = useThemeStore((state) => state.theme === 'dark');
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect desktop view
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768); // md breakpoint
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Check Supabase connection
  useEffect(() => {
    const checkSupabaseConnection = async () => {
      try {
        const response = await api.get('/api/health');
        setSupabaseStatus('connected');
      } catch (error) {
        setSupabaseStatus('disconnected');
      }
    };
    checkSupabaseConnection();
  }, []);


  // Check for deactivated account redirect
  useEffect(() => {
    if (searchParams.get('deactivated') === 'true') {
      setError('Your account has been deactivated. Please contact the administrator.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/login', { username, password });
      const { user, token } = response.data;

      setUser(user);
      setToken(token);

      // Redirect based on role
      const role = user?.role || 'admin';
      
      switch (role) {
        case 'superadmin':
          router.push('/superadmin/dashboard');
          break;
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
          router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`${styles.body} ${isDarkMode ? styles.darkMode : ''}`}>
      <div className={styles.shapesBg}>
        <div className={styles.shape1}></div>
        <div className={styles.shape2}></div>
        <div className={styles.shape3}></div>
      </div>

      {/* Top-Left Logo */}
      <div className={styles.topLogo}>
        <svg className={styles.ribbonLogoTop} viewBox="10 28 240 55" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 35h220l-10 12 10 12H20l10-12z" fill="#fce7f3" stroke="#ec4899" strokeWidth="1.5"/>
          <text x="130" y="52" fontFamily="'Cinzel',serif" fontWeight="800" fontSize="17" fill="#be185d" textAnchor="middle" letterSpacing="3">ABIFRESH</text>
          <text x="130" y="75" fontFamily="'Plus Jakarta Sans',sans-serif" fontWeight="600" fontSize="10" fill={isDesktop && !isDarkMode ? '#ec4899' : (isDarkMode ? '#ffffff' : '#fbbf24')} textAnchor="middle" letterSpacing="3">&amp; KIDDIES VENTURES</text>
          <circle cx="56" cy="47" r="2" fill="#f472b6"/>
          <circle cx="204" cy="47" r="2" fill="#f472b6"/>
        </svg>
      </div>

      {/* Supabase Status Banner */}

      <div className={styles.container}>
        <div className={styles.loginWrapper}>
          {/* Left: Info Section */}
          <div className={styles.infoSection}>
            <h2>Manage Your Business Effortlessly.</h2>
            <p>A unified system for tracking inventory, processing sales, and monitoring business performance for Abifresh & Kiddies Ventures!</p>
            <div className={styles.features}>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <div className={styles.featureText}>
                  <h4>Sales Analytics</h4>
                  <p>Real-time dashboards track revenue, inventory, and team performance</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <div className={styles.featureText}>
                  <h4>Inventory Control</h4>
                  <p>Manage stock levels, track transfers, and real-time inventory visibility.</p>
                </div>
              </div>
              <div className={styles.feature}>
                <div className={styles.featureIcon}>✓</div>
                <div className={styles.featureText}>
                  <h4>Staff Tracking</h4>
                  <p>Commission calculations, task assignments, and performance monitoring</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Form Section */}
          <div className={styles.formSection}>
            <div className={styles.loginBox}>
              {/* Status Indicator */}
              <div className={styles.statusIndicator} title={`Database: ${supabaseStatus}`}>
                <span className={`${styles.statusDot} ${styles[`status_${supabaseStatus}`]}`}></span>
              </div>

              <div className={styles.formHeader}>
                <h3>Welcome! 😊</h3>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <form onSubmit={handleLogin}>
                <div className={styles.formGroup}>
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div className={styles.passwordGroup}>
                  <label>Password</label>
                  <div className={styles.passwordWrapper}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeToggle}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setShowForgotModal(true)}
                    className={styles.forgotBtnBelow}
                  >
                    Forgot?
                  </button>
                </div>

                <button type="submit" className={styles.btnLogin} disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} ABIFRESH &amp; KIDDIES VENTURES. All rights reserved.</p>
      </div>

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className={styles.darkModeToggle}
      >
        {isDarkMode ? (
          <Sun size={20} strokeWidth={1.5} />
        ) : (
          <Moon size={20} strokeWidth={1.5} />
        )}
      </button>

      {/* Install Button */}
      <div className={styles.installButtonContainer}>
        <InstallButton />
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className={styles.modalOverlay} onClick={() => setShowForgotModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Password Reset</h2>
              <button 
                onClick={() => setShowForgotModal(false)}
                className={styles.modalClose}
              >
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <p>To reset your password, please contact your administrator for assistance.</p>
              <p className={styles.contactInfo}>They will help you regain access to your account.</p>
            </div>
            <div className={styles.modalButtons}>
              <button 
                onClick={() => setShowForgotModal(false)}
                className={styles.btnClose}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
