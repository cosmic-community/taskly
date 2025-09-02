import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getBoardCards, createCard, getUserBoards } from '@/lib/cosmic';

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

    // Get all user's boards and then their cards
    const boards = await getUserBoards(decoded.userId);
    const allCards = [];
    
    for (const board of boards) {
      const cards = await getBoardCards(board.id);
      allCards.push(...cards);
    }

    return NextResponse.json(allCards);
  } catch (error) {
    console.error('Get cards error:', error);
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

    const { boardId, columnId, title, description, labels, dueDate, order } = await request.json();

    if (!boardId || !columnId || !title?.trim()) {
      return NextResponse.json(
        { error: 'Board ID, column ID, and card title are required' },
        { status: 400 }
      );
    }

    const card = await createCard(
      boardId,
      columnId,
      title.trim(),
      description,
      labels,
      dueDate,
      order || 100
    );

    return NextResponse.json(card);
  } catch (error) {
    console.error('Create card error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}