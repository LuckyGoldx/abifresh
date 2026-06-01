import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';

const MAX_PLATFORMS = 100;
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

    const rawPlatforms = (platformResult.data || []) as { platform: string }[];
    const platformBreakdown: Record<string, number> = {};
    let platformCount = 0;
    for (const item of rawPlatforms) {
      if (platformCount >= MAX_PLATFORMS) break;
      const p = item.platform || 'unknown';
      platformBreakdown[p] = (platformBreakdown[p] || 0) + 1;
      platformCount++;
    }

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
