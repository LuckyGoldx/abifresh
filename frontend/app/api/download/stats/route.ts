import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const emptyStats = { totalDownloads: 0, recentDownloads: 0, todayDownloads: 0, platformBreakdown: {} };

export async function GET(_request: NextRequest) {
  try {
    const [totalResult, platformResult, recentResult, todayResult] = await Promise.all([
      supabaseAdmin.from('pwa_downloads').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('pwa_downloads').select('platform'),
      supabaseAdmin
        .from('pwa_downloads')
        .select('*', { count: 'exact', head: true })
        .gte('downloaded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabaseAdmin
        .from('pwa_downloads')
        .select('*', { count: 'exact', head: true })
        .gte('downloaded_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const platformBreakdown = (platformResult.data || []).reduce(
      (acc: Record<string, number>, item: { platform: string }) => {
        const p = item.platform || 'unknown';
        acc[p] = (acc[p] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      totalDownloads: totalResult.count || 0,
      recentDownloads: recentResult.count || 0,
      todayDownloads: todayResult.count || 0,
      platformBreakdown,
    });
  } catch (error) {
    console.error('Download stats error:', error);
    return NextResponse.json(emptyStats);
  }
}
