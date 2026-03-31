import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * POST /api/sales/returned-items/[id]/accept
 * Accept returned items and move them to active store
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const returnedItemId = params.id;

    // Accept the returned items using service
    const result = await returnedItemsService.acceptReturnedItems(authResult.id, [returnedItemId]);

    return NextResponse.json({
      returned_items: result,
      message: 'Returned items accepted successfully',
    });
  } catch (error: any) {
    console.error('Error accepting returned items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept items' },
      { status: 400 }
    );
  }
}
