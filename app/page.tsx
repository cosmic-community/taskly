'use client';

import { useEffect, useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';
import CardDragOverlay from '@/components/CardDragOverlay';
import ColumnDragOverlay from '@/components/ColumnDragOverlay';
import { Card, Column, DragData } from '@/types';

export default function TasklyApp() {
  const taskly = useTaskly();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DragData;

    if (dragData?.type === 'card') {
      setActiveCard(dragData.card);
    } else if (dragData?.type === 'column') {
      setActiveColumn(dragData.column);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveCard(null);
      setActiveColumn(null);
      return;
    }

    const activeData = active.data.current as DragData;
    const overData = over.data.current as DragData;

    // Handle card drag
    if (activeData?.type === 'card') {
      const card = activeData.card;
      
      if (overData?.type === 'column-cards') {
        // Dropped in a column
        const newColumnId = overData.columnId;
        if (card.columnId !== newColumnId) {
          const targetCards = taskly.getColumnCards(newColumnId);
          const newOrder = targetCards.length > 0 
            ? Math.max(...targetCards.map(c => c.order)) + 100
            : 100;
          
          taskly.moveCard(card.id, newColumnId, newOrder);
        }
      } else if (overData?.type === 'card') {
        // Dropped on another card
        const targetCard = overData.card;
        if (card.id !== targetCard.id) {
          const newOrder = targetCard.order;
          taskly.moveCard(card.id, targetCard.columnId, newOrder);
        }
      }
    }

    // Handle column drag
    if (activeData?.type === 'column') {
      const column = activeData.column;
      
      if (overData?.type === 'column') {
        const targetColumn = overData.column;
        if (column.id !== targetColumn.id) {
          // Get current column order for the board
          const boardColumns = taskly.getBoardColumns(column.boardId);
          const columnIds = boardColumns.map(c => c.id);
          
          // Remove the active column and insert it at the target position
          const filteredIds = columnIds.filter(id => id !== column.id);
          const targetIndex = filteredIds.indexOf(targetColumn.id);
          const newColumnIds = [
            ...filteredIds.slice(0, targetIndex),
            column.id,
            ...filteredIds.slice(targetIndex)
          ];
          
          taskly.reorderColumns(column.boardId, newColumnIds);
        }
      }
    }

    setActiveCard(null);
    setActiveColumn(null);
  };

  // Show loading state
  if (!taskly.isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth panel if not authenticated
  if (!taskly.appState.user) {
    return <AuthPanel />;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <main className="min-h-screen bg-background">
        {taskly.uiState.currentView === 'boards' && (
          <BoardsPanel taskly={taskly} />
        )}

        {taskly.uiState.currentView === 'board' && taskly.selectedBoard && (
          <BoardPanel taskly={taskly} board={taskly.selectedBoard} />
        )}

        {/* Card Modal */}
        {taskly.selectedCard && (
          <CardModal
            taskly={taskly}
            card={taskly.selectedCard}
            onClose={() => taskly.selectCard(null)}
          />
        )}

        {/* Drag Overlays */}
        <DragOverlay>
          {activeCard && <CardDragOverlay card={activeCard} />}
          {activeColumn && <ColumnDragOverlay column={activeColumn} />}
        </DragOverlay>
      </main>
    </DndContext>
  );
}