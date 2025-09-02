import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBoardColumns, createColumn, getUserBoards } from '@/lib/cosmic';

export async function GET(request: NextRequest) {
  try {
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

    // Get all user's boards and then their columns
    const boards = await getUserBoards(decoded.userId);
    const allColumns = [];
    
    for (const board of boards) {
      const columns = await getBoardColumns(board.id);
      allColumns.push(...columns);
    }

    return NextResponse.json(allColumns);
  } catch (error) {
    console.error('Get columns error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { boardId, title, order } = await request.json();

    if (!boardId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Board ID and column title are required' },
        { status: 400 }
      );
    }

    const column = await createColumn(boardId, title.trim(), order || 100);
    return NextResponse.json(column);
  } catch (error) {
    console.error('Create column error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}