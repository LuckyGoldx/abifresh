import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/server/supabase-admin';
import { serverCache } from '@/lib/server/cache';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  // SSE auth via token query param (EventSource can't set Authorization header)
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 });
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  if (decoded.role !== 'superadmin') {
    return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
  }

  // Create cache key for stream endpoint
  const cacheKey = 'logs:stream:activity:50';

  // Check cache first (3 minute TTL for stream - shorter than main endpoint)
  let data: any[] | null = serverCache.get(cacheKey) as any[] | null;
  let fromCache = false;

  if (!data) {
    // Fetch recent activity logs to stream
    const result = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    data = (result.data as any[]) || [];

    // Cache the result for 3 minutes
    if (data) {
      serverCache.set(cacheKey, data, 3 * 60 * 1000);
    }
  } else {
    fromCache = true;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, logData: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(logData)}\n\n`));
      };

      const cacheStatus = fromCache ? ' (cached)' : '';
      send('connected', { 
        message: `Connected to activity log stream${cacheStatus}`, 
        timestamp: new Date().toISOString(),
        fromCache,
      });

      for (const log of (data || [])) {
        send('log', {
          timestamp: log.created_at,
          level: 'info',
          message: `[${log.action}] ${log.entity_type}:${log.entity_id}`,
          action: log.action,
          entity_type: log.entity_type,
          details: log.details,
        });
      }

      send('done', { 
        message: 'Stream complete (serverless: no real-time log files available)',
        itemsCount: (data || []).length,
      });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
