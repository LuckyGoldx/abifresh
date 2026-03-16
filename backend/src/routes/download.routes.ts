import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import logger from '../config/logger';

const router = Router();

// Track PWA download
router.post('/track', async (req: Request, res: Response) => {
  try {
    const { platform, userAgent, timestamp } = req.body;

    // Insert download record
    const { data, error } = await supabaseAdmin
      .from('pwa_downloads')
      .insert([
        {
          platform: platform || 'unknown',
          user_agent: userAgent || req.headers['user-agent'],
          ip_address: req.ip,
          downloaded_at: timestamp || new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      logger.error('Failed to track download', { error });
      return res.status(500).json({ error: 'Failed to track download' });
    }

    res.json({ success: true, id: data?.[0]?.id });
  } catch (error) {
    logger.error('Download tracking error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get download statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Total downloads
    const { count: totalDownloads } = await supabaseAdmin
      .from('pwa_downloads')
      .select('*', { count: 'exact', head: true });

    // Downloads by platform
    const { data: platformStats } = await supabaseAdmin
      .from('pwa_downloads')
      .select('platform')
      .order('downloaded_at', { ascending: false });

    const platformBreakdown = platformStats?.reduce(
      (acc, item) => {
        acc[item.platform || 'unknown'] = (acc[item.platform || 'unknown'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ) || {};

    // Downloads in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentDownloads } = await supabaseAdmin
      .from('pwa_downloads')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', sevenDaysAgo.toISOString());

    // Downloads today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayDownloads } = await supabaseAdmin
      .from('pwa_downloads')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', today.toISOString());

    res.json({
      totalDownloads: totalDownloads || 0,
      recentDownloads: recentDownloads || 0,
      todayDownloads: todayDownloads || 0,
      platformBreakdown,
    });
  } catch (error) {
    logger.error('Failed to fetch download stats', { error });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get download history (for analytics)
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

    const { data, error } = await supabaseAdmin
      .from('pwa_downloads')
      .select('*')
      .order('downloaded_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch download history', { error });
      return res.status(500).json({ error: 'Failed to fetch history' });
    }

    res.json({ data: data || [], count: data?.length || 0 });
  } catch (error) {
    logger.error('Download history error', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
