import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';
import { withIdempotency } from '@/lib/server/idempotency';

/**
 * POST /api/admin/returned-items/[id]/reject
 * Reject returned items (Admin override)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    if (!['admin', 'superadmin'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const idempotencyKey = req.headers.get('Idempotency-Key') || req.headers.get('idempotency-key') || null;

    return await withIdempotency(idempotencyKey, async () => {
      const { reject_reason } = await req.json();
      if (!reject_reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
      }
      const returnedItemId = params.id;
      const result = await returnedItemsService.rejectReturnedItems(authResult.id, [returnedItemId], reject_reason, true);
      return NextResponse.json({ returned_items: result, message: 'Returned items rejected successfully (Admin)' });
    });
  } catch (error: any) {
    console.error('Error rejecting returned items (admin):', error);
    return NextResponse.json({ error: error.message || 'Failed to reject items' }, { status: 400 });
  }
}