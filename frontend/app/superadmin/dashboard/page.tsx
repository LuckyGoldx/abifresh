import dynamic from 'next/dynamic';

const SuperAdminDashboardContent = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <SkeletonPage />,
});

import { SkeletonPage } from '@/components/Skeleton';

export default function SuperAdminDashboard() {
  return <SuperAdminDashboardContent />;
}
