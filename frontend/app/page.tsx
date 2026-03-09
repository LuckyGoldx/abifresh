'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import LoadingLogo from '@/components/LoadingLogo';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Redirect to role-specific dashboard
    if (user) {
      switch (user.role) {
        case 'admin':
          router.push('/admin/dashboard');
          break;
        case 'sales':
          router.push('/sales/dashboard');
          break;
        case 'staff_commission':
        case 'staff_non_commission':
          router.push('/staff/dashboard');
          break;
        default:
          router.push('/login');
      }
    } else {
      // Not authenticated, redirect to login
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  return <LoadingLogo fullScreen text="Loading dashboard..." />;
}
