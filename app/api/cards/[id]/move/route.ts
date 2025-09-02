// app/api/cards/[id]/move/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { updateCard } from '@/lib/cosmic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = request.headers.get('authorization');
    
    if (!authorization?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authorization.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { columnId, order } = await request.json();

    if (!columnId || order === undefined) {
      return NextResponse.json(
        { error: 'Column ID and order are required' },
        { status: 400 }
      );
    }

    await updateCard(id, { columnId, order });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Move card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}