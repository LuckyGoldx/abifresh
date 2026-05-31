'use client';

interface AbifreshLoadingProps {
  showSkeletons?: boolean;
  statCount?: number;
  tableRows?: number;
  tableCols?: number;
  showChart?: boolean;
  showHeader?: boolean;
}

export function AbifreshLoading({
  showSkeletons = false,
  statCount = 4,
  tableRows = 5,
  tableCols = 5,
  showChart = false,
  showHeader = false,
}: AbifreshLoadingProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-pulse">
          <img src="/favicon.svg" alt="" className="w-20 h-20" />
        </div>
        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
          <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold">Abifreshing...</span>
        </div>
      </div>
      {showSkeletons && (
        <div className="w-full max-w-6xl mt-8 space-y-6">
          {showHeader && (
            <div className="flex items-center justify-between">
              <div className="h-7 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            </div>
          )}
          {statCount > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: statCount }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {showChart && (
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          )}
          {tableRows > 0 && (
            <div className="space-y-3">
              {Array.from({ length: tableRows }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  {Array.from({ length: tableCols }).map((_, j) => (
                    <div key={j} className="flex-1 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
