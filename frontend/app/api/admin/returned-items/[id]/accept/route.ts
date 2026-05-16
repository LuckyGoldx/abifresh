import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/server/auth';
import { returnedItemsService } from '@/lib/server/returned-items.service';

/**
 * POST /api/admin/returned-items/[id]/accept
 * Accept returned items (Admin override)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    // Check if user is admin or superadmin
    if (!['admin', 'superadmin'].includes(authResult.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const returnedItemId = params.id;

    // Accept the returned items using service with isAdmin=true
    const result = await returnedItemsService.acceptReturnedItems(authResult.id, [returnedItemId], true);

    return NextResponse.json({
      returned_items: result,
      message: 'Returned items accepted successfully (Admin)',
    });
  } catch (error: any) {
    console.error('Error accepting returned items (admin):', error);
    return NextResponse.json(
      { error: error.message || 'Failed to accept items' },
      { status: 400 }
    );
  }
}
