import dynamic from 'next/dynamic';

const SalesAnalysisPage = dynamic(() => import('@/components/SalesAnalysisPage'), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl mx-4 my-8" />,
});

export default function AdminSalesAnalysisPage() {
  return <SalesAnalysisPage portalType="admin" />;
}
