import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * GET /api/admin/returned-items
 * Get all items returned by all staff (Admin view)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    // Check if user is admin or superadmin
    if (!['admin', 'superadmin'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const items = await returnedItemsService.getAllReturns();
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching returned items (admin):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch items' },
      { status: 400 }
    );
  }
}
