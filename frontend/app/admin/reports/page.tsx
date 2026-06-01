import dynamic from 'next/dynamic';

const ReportsContent = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <LoadingLogo />,
});

import LoadingLogo from '@/components/LoadingLogo';

export default function ReportsPage() {
  return <ReportsContent />;
}
