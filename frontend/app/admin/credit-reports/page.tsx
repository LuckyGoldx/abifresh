import dynamic from 'next/dynamic';

const CreditReportsContent = dynamic(() => import('./content'), {
  ssr: false,
  loading: () => <LoadingLogo />,
});

import LoadingLogo from '@/components/LoadingLogo';

export default function CreditReportsPage() {
  return <CreditReportsContent />;
}
