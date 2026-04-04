import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, hasRole } from '@/lib/server/auth';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { serverCache } from '@/lib/server/cache';

export async function GET(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  if (!hasRole(authResult.role, 'superadmin')) {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const lines = Math.min(parseInt(searchParams.get('lines') || '200'), 1000);
  const logType = searchParams.get('type') || 'activity';
  const logDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

  // Create cache key based on query parameters
  const cacheKey = `logs:${logType}:${logDate}:${lines}`;

  // Check cache first (5 minute TTL)
  const cachedResult = serverCache.get(cacheKey);
  if (cachedResult) {
    return NextResponse.json({ ...cachedResult, fromCache: true });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(lines);

    if (error) throw error;

    const entries = (data || []).map((log: any) => ({
      timestamp: log.created_at,
      level: 'info',
      message: `[${log.action}] ${log.entity_type}:${log.entity_id}`,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      user_id: log.user_id,
      details: log.details,
    }));

    const response = {
      type: 'activity',
      date: logDate,
      filename: 'activity_logs',
      entries,
      totalEntries: entries.length,
      availableFiles: ['activity_logs'],
      note: 'Serverless mode: showing activity_logs from database (file-based logs unavailable)',
      fromCache: false,
    };

    // Cache the result for 5 minutes
    serverCache.set(cacheKey, response, 5 * 60 * 1000);

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
