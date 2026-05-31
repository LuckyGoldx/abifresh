'use client';

/** Base shimmer block used by all skeleton variants */
function Shimmer({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/* ── Text ─────────────────────────────────────────────────── */

export function SkeletonText({ width = '100%', lines = 3, className = '' }: {
  width?: string;
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`} aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : ''}`}
          style={{ width: i === lines - 1 ? '75%' : width }}
        />
      ))}
    </div>
  );
}

/* ── Stat Card ────────────────────────────────────────────── */

export function SkeletonStatCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`card flex items-center gap-3 md:gap-4 ${className}`}
      aria-label="Loading stat"
    >
      <Shimmer className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-5 w-24" />
      </div>
    </div>
  );
}

export function SkeletonStatGrid({
  count = 4,
  cols = 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4',
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-4`} aria-label="Loading statistics">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/* ── Table ────────────────────────────────────────────────── */

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700" aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Shimmer className={`h-4 ${i === 0 ? 'w-28' : i === cols - 1 ? 'w-20' : 'w-16'}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden ${className}`} aria-label="Loading table">
      {/* header shimmer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
        <div className="flex gap-6">
          {Array.from({ length: cols }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-16" />
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => (
              <SkeletonTableRow key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Item Card (for grids of product cards) ───────────────── */

export function SkeletonItemCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`card flex flex-col items-center text-center p-4 ${className}`}
      aria-label="Loading item"
    >
      <Shimmer className="w-16 h-16 rounded-lg mb-3" />
      <Shimmer className="h-4 w-24 mb-1" />
      <Shimmer className="h-3 w-16 mb-3" />
      <Shimmer className="h-8 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonItemGrid({
  count = 8,
  cols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
}: {
  count?: number;
  cols?: string;
}) {
  return (
    <div className={`grid ${cols} gap-3`} aria-label="Loading items">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItemCard key={i} />
      ))}
    </div>
  );
}

/* ── Two-Column Page Layout (post-items, make-sale) ──────── */

export function SkeletonTwoColumnPage({ className = '' }: { className?: string }) {
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 space-y-6 ${className}`} aria-label="Loading page">
      <div className="animate-pulse">
        <img src="/favicon.svg" alt="" className="w-20 h-20" />
      </div>
      <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
        <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold">Abifreshing...</span>
      </div>
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
        {/* Left column: controls + item grid */}
        <div className="flex-1 space-y-4">
          <Shimmer className="h-10 w-full rounded-lg" />
          <div className="flex gap-3">
            <Shimmer className="h-9 w-48 rounded-lg" />
            <Shimmer className="h-9 w-40 rounded-lg" />
          </div>
          <SkeletonItemGrid count={8} cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" />
        </div>
        {/* Right column: cart sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-3">
          <Shimmer className="h-6 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-3 space-y-2">
              <div className="flex justify-between">
                <Shimmer className="h-4 w-28" />
                <Shimmer className="h-4 w-4 rounded" />
              </div>
              <Shimmer className="h-3 w-16" />
              <div className="flex items-center gap-2">
                <Shimmer className="h-6 w-6 rounded" />
                <Shimmer className="h-6 w-8" />
                <Shimmer className="h-6 w-6 rounded" />
              </div>
              <Shimmer className="h-4 w-20 ml-auto" />
            </div>
          ))}
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/* ── Full Page Skeleton (generic fallback) ────────────────── */

export function SkeletonPage({ className = '' }: { className?: string }) {
  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 space-y-6 ${className}`} aria-label="Loading page">
      <div className="animate-pulse">
        <img src="/favicon.svg" alt="" className="w-20 h-20" />
      </div>
      <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
        <div className="w-5 h-5 border-2 border-pink-600 dark:border-pink-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold">Abifreshing...</span>
      </div>
      <div className="w-full max-w-6xl space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <Shimmer className="h-7 w-48" />
          <Shimmer className="h-9 w-28 rounded-lg" />
        </div>
        {/* stat cards */}
        <SkeletonStatGrid count={4} />
        {/* chart placeholder */}
        <Shimmer className="h-64 w-full rounded-lg" />
        {/* table */}
        <SkeletonTable rows={4} cols={4} />
      </div>
    </div>
  );
}

/* ── Chart Placeholder ────────────────────────────────────── */

export function SkeletonChart({ height = 'h-64', className = '' }: {
  height?: string;
  className?: string;
}) {
  return (
    <div className={`card ${className}`} aria-label="Loading chart">
      <Shimmer className={`${height} w-full rounded-lg`} />
    </div>
  );
}
