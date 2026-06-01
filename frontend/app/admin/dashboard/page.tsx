import dynamic from 'next/dynamic';

const AdminDashboardContent = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <SkeletonPage />,
});

import { SkeletonPage } from '@/components/Skeleton';

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}
