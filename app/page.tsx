'use client';

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useTaskly } from '@/lib/hooks';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';
import CardDragOverlay from '@/components/CardDragOverlay';
import ColumnDragOverlay from '@/components/ColumnDragOverlay';

export default function TasklyApp() {
  const taskly = useTaskly();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragData, setDragData] = useState<any>(null);

  if (!taskly.isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading Taskly...</div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setDragData(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setDragData(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) {
      setActiveId(null);
      setDragData(null);
      return;
    }

    // Handle card drag
    if (activeData.type === 'card') {
      const card = activeData.card;
      if (!card) return;

      if (overData.type === 'column-cards') {
        const newColumnId = overData.columnId;
        if (!newColumnId) return;

        // Get cards in the target column
        const targetCards = taskly.getColumnCards(newColumnId);
        const newOrder = targetCards.length > 0 
          ? Math.max(...targetCards.map(c => c.order)) + 100
          : 100;

        taskly.moveCard(card.id, newColumnId, newOrder);
      } else if (overData.type === 'card') {
        // Handle reordering within the same column or moving to a different column
        const overCard = taskly.appState.cards.find(c => c.id === over.id);
        if (!overCard) return;

        const targetColumnId = overCard.columnId;
        const targetCards = taskly.getColumnCards(targetColumnId);
        const overCardIndex = targetCards.findIndex(c => c.id === overCard.id);
        
        let newOrder: number;
        
        if (overCardIndex === 0) {
          // Moving to the beginning
          newOrder = overCard.order - 100;
        } else if (overCardIndex === targetCards.length - 1) {
          // Moving to the end
          newOrder = overCard.order + 100;
        } else {
          // Moving between cards
          const prevCard = targetCards[overCardIndex - 1];
          const nextCard = targetCards[overCardIndex + 1];
          newOrder = taskly.calculateNewOrder(prevCard?.order, nextCard?.order);
        }

        taskly.moveCard(card.id, targetColumnId, newOrder);
      }
    }

    // Handle column drag
    if (activeData.type === 'column' && overData.type === 'column') {
      const activeColumn = activeData.column;
      const overColumn = taskly.appState.columns.find(c => c.id === over.id);
      
      // FIXED: Add explicit null check for overColumn before using it
      if (!activeColumn || !overColumn) {
        setActiveId(null);
        setDragData(null);
        return;
      }

      // Additional check to ensure columns are in the same board
      if (activeColumn.boardId !== overColumn.boardId) {
        setActiveId(null);
        setDragData(null);
        return;
      }

      const boardColumns = taskly.getBoardColumns(activeColumn.boardId);
      const activeIndex = boardColumns.findIndex(c => c.id === activeColumn.id);
      const overIndex = boardColumns.findIndex(c => c.id === overColumn.id);

      if (activeIndex !== overIndex) {
        const newColumnOrder = [...boardColumns];
        const [movedColumn] = newColumnOrder.splice(activeIndex, 1);
        newColumnOrder.splice(overIndex, 0, movedColumn);
        
        // Now overColumn is guaranteed to be defined due to the null check above
        taskly.reorderColumns(
          activeColumn.boardId,
          newColumnOrder.map(c => c.id)
        );
      }
    }

    setActiveId(null);
    setDragData(null);
  };

  const renderDragOverlay = () => {
    if (!activeId || !dragData) return null;

    if (dragData.type === 'card') {
      const card = dragData.card;
      return card ? <CardDragOverlay card={card} /> : null;
    }

    if (dragData.type === 'column') {
      const column = dragData.column;
      return column ? <ColumnDragOverlay column={column} /> : null;
    }

    return null;
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background">
        {taskly.uiState.currentView === 'boards' && (
          <BoardsPanel taskly={taskly} />
        )}
        {taskly.uiState.currentView === 'board' && taskly.selectedBoard && (
          <BoardPanel taskly={taskly} board={taskly.selectedBoard} />
        )}
        {taskly.uiState.currentView === 'card' && taskly.selectedCard && (
          <CardModal 
            taskly={taskly} 
            card={taskly.selectedCard} 
            onClose={() => taskly.selectCard(null)} 
          />
        )}
      </div>
      
      <DragOverlay>
        {renderDragOverlay()}
      </DragOverlay>
    </DndContext>
  );
}