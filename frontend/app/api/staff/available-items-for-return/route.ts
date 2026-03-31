import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * GET /api/staff/available-items-for-return
 * Get items available in staff store for return
 * CRITICAL: Uses price_jalingo (selling price), NOT unit_price (cost price)
 */
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    // Get available items using service (calculates quantity_available + filters pending returns)
    const items = await returnedItemsService.getAvailableItemsForReturn(authResult.id);
    
    return NextResponse.json(items);
  } catch (error: any) {
    console.error('Error fetching available items for return:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch items' },
      { status: 400 }
    );
  }
}
