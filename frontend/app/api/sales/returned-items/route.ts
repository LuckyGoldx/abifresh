import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * GET /api/sales/returned-items
 * Get all items returned to this sales staff
 * CRITICAL: Uses price_jalingo (selling price), NOT unit_price (cost price)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const items = await returnedItemsService.getReturnsForReceiver(authResult.id);
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching returned items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch items' },
      { status: 400 }
    );
  }
}
