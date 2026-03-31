import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * POST /api/sales/returned-items/[id]/reject
 * Reject returned items and return to requester's staff_store
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { reject_reason } = await req.json();
    if (!reject_reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const returnedItemId = params.id;

    // Reject the returned items using service
    const result = await returnedItemsService.rejectReturnedItems(
      authResult.id,
      [returnedItemId],
      reject_reason
    );

    return NextResponse.json({
      returned_items: result,
      message: 'Returned items rejected successfully',
    });
  } catch (error: any) {
    console.error('Error rejecting returned items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reject items' },
      { status: 400 }
    );
  }
}
