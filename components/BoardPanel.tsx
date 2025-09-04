'use client';

import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board, Column, Card } from '@/types';
import Column as ColumnComponent from './Column';
import Card as CardComponent from './Card';
import CardModal from './CardModal';
import ColumnDragOverlay from './ColumnDragOverlay';
import CardDragOverlay from './CardDragOverlay';

interface ColumnDragOverlayProps {
  column: Column;
}

interface CardModalProps {
  card: Card;
  onClose: () => void;
}

export default function BoardPanel() {
  const taskly = useTaskly();
  const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Get current board
  const currentBoard = useMemo(() => {
    if (!taskly.uiState.selectedBoardId) return null;
    return taskly.appState.boards.find((b: Board) => b.id === taskly.uiState.selectedBoardId) || null;
  }, [taskly.appState.boards, taskly.uiState.selectedBoardId]);

  // Get columns for current board
  const boardColumns = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.appState.columns
      .filter((col: Column) => col.boardId === currentBoard.id)
      .sort((a: Column, b: Column) => a.order - b.order);
  }, [taskly.appState.columns, currentBoard]);

  // Get todo cards for current board
  const todoCards = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.appState.cards.filter((card: Card) => card.boardId === currentBoard.id && !card.isArchived);
  }, [taskly.appState.cards, currentBoard]);

  // Get done cards for current board
  const doneCards = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.appState.cards.filter((card: Card) => card.boardId === currentBoard.id && card.isArchived);
  }, [taskly.appState.cards, currentBoard]);

  if (!currentBoard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Board not found</h2>
          <p className="text-muted-foreground mb-4">The selected board could not be found.</p>
          <button
            onClick={() => taskly.setCurrentView('boards')}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { current } = active.data;

    if (current?.type === 'column') {
      setDraggedColumn(current.column as Column);
    } else if (current?.type === 'card') {
      setDraggedCard(current.card as Card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setDraggedColumn(null);
      setDraggedCard(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeColumn = activeData.column as Column;
      const overColumn = overData.column as Column;

      if (activeColumn.id !== overColumn.id) {
        const activeIndex = boardColumns.findIndex((c: Column) => c.id === activeColumn.id);
        const overIndex = boardColumns.findIndex((c: Column) => c.id === overColumn.id);

        if (activeIndex !== -1 && overIndex !== -1) {
          const newColumns = arrayMove(boardColumns, activeIndex, overIndex).map((c: Column, index: number) => ({
            ...c,
            order: index,
          }));
          taskly.reorderColumns(currentBoard.id, newColumns);
        }
      }
    }

    // Handle card movement
    if (activeData?.type === 'card') {
      const activeCard = activeData.card as Card;
      let destinationColumnId: string;
      let newOrder: number = 0;

      if (overData?.type === 'column') {
        // Dropped on column
        destinationColumnId = (overData.column as Column).id;
        const columnCards = todoCards.filter((c: Card) => c.columnId === destinationColumnId);
        newOrder = columnCards.length > 0 ? Math.max(...columnCards.map((c: Card) => c.order)) + 1 : 0;
      } else if (overData?.type === 'card') {
        // Dropped on another card
        const overCard = overData.card as Card;
        destinationColumnId = overCard.columnId;
        
        const columnCards = todoCards
          .filter((c: Card) => c.columnId === destinationColumnId)
          .sort((a: Card, b: Card) => a.order - b.order);
        
        const overIndex = columnCards.findIndex((c: Card) => c.id === overCard.id);
        if (overIndex !== -1) {
          newOrder = overCard.order;
          // Reorder cards in the destination column
          const updatedCards = columnCards.map((c: Card, index: number) => {
            if (c.id === activeCard.id) return c; // Skip the moved card
            if (index >= overIndex) {
              return { ...c, order: c.order + 1 };
            }
            return c;
          });
          
          // Update all affected cards
          updatedCards.forEach((card: Card) => {
            if (card.id !== activeCard.id) {
              taskly.updateCard(card.id, { order: card.order });
            }
          });
        }
      } else {
        setDraggedCard(null);
        return;
      }

      // Move the card
      if (activeCard.columnId !== destinationColumnId || activeCard.order !== newOrder) {
        taskly.moveCard(activeCard.id, destinationColumnId, newOrder);
      }
    }

    setDraggedColumn(null);
    setDraggedCard(null);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    try {
      await taskly.createColumn(currentBoard.id, newColumnTitle.trim());
      setNewColumnTitle('');
      setIsCreatingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const getColumnCards = (columnId: string): Card[] => {
    return todoCards.filter((c: Card) => c.columnId === columnId).sort((a: Card, b: Card) => a.order - b.order);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => taskly.setCurrentView('boards')}
              className="btn-secondary p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-foreground">{currentBoard.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="p-6">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-6">
            <SortableContext items={boardColumns.map((c: Column) => c.id)} strategy={verticalListSortingStrategy}>
              {boardColumns.map((column: Column) => (
                <ColumnComponent
                  key={column.id}
                  column={column}
                  cards={getColumnCards(column.id)}
                  onCardClick={(card: Card) => setSelectedCard(card)}
                />
              ))}
            </SortableContext>

            {/* Add Column */}
            <div className="min-w-[300px]">
              {isCreatingColumn ? (
                <form onSubmit={handleCreateColumn} className="glass-light border border-border/20 rounded-xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title..."
                    className="input-modern mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="btn-primary text-sm"
                      disabled={!newColumnTitle.trim()}
                    >
                      Add Column
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingColumn(true)}
                  className="w-full h-fit p-4 border-2 border-dashed border-border/40 rounded-xl text-muted-foreground hover:text-foreground hover:border-border transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add a column</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlays */}
          <DragOverlay>
            {draggedColumn && (
              <ColumnDragOverlay 
                column={draggedColumn}
              />
            )}
            {draggedCard && <CardDragOverlay card={draggedCard} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}