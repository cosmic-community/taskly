'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Archive, ArchiveRestore, Settings, Users, Calendar } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Card, Column, DragData } from '@/types';
import ColumnComponent from './Column';
import CardComponent from './Card';
import CardDragOverlay from './CardDragOverlay';
import ColumnDragOverlay from './ColumnDragOverlay';
import CardModal from './CardModal';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [dragData, setDragData] = useState<DragData | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);

  // Get current board
  const currentBoard = useMemo(() => {
    if (!taskly.uiState.selectedBoardId) return null;
    return taskly.boards.find(b => b.id === taskly.uiState.selectedBoardId) || null;
  }, [taskly.boards, taskly.uiState.selectedBoardId]);

  // Get columns for current board
  const boardColumns = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.columns
      .filter(col => col.boardId === currentBoard.id)
      .sort((a, b) => a.order - b.order);
  }, [taskly.columns, currentBoard]);

  // Get cards for current board
  const boardCards = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.cards.filter(card => card.boardId === currentBoard.id && !card.isArchived);
  }, [taskly.cards, currentBoard]);

  // Get archived cards count
  const archivedCardsCount = useMemo(() => {
    if (!currentBoard) return 0;
    return taskly.cards.filter(card => card.boardId === currentBoard.id && card.isArchived).length;
  }, [taskly.cards, currentBoard]);

  // Sensor configuration for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Check if dragging a card
    const card = boardCards.find(c => c.id === activeId);
    if (card) {
      setDragData({ type: 'card', card });
      return;
    }

    // Check if dragging a column
    const column = boardColumns.find(c => c.id === activeId);
    if (column) {
      setDragData({ type: 'column', column });
      return;
    }

    // Check if dragging column cards container
    const columnId = activeId.startsWith('column-cards-') ? activeId.replace('column-cards-', '') : null;
    if (columnId) {
      setDragData({ type: 'column-cards', columnId });
    }
  }, [boardCards, boardColumns]);

  // Handle drag end
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDragData(null);

    if (!over || !currentBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle card movement
    if (dragData?.type === 'card') {
      const activeCard = boardCards.find(c => c.id === activeId);
      if (!activeCard) return; // Fixed: Add null check before using activeCard

      // Moving to a different column
      if (overId.startsWith('column-cards-')) {
        const newColumnId = overId.replace('column-cards-', '');
        if (newColumnId !== activeCard.columnId) {
          const cardsInNewColumn = boardCards.filter(c => c.columnId === newColumnId);
          const newOrder = cardsInNewColumn.length > 0 
            ? Math.max(...cardsInNewColumn.map(c => c.order)) + 100 
            : 100;
          
          await taskly.updateCard(activeCard.id, { 
            columnId: newColumnId, 
            order: newOrder 
          });
        }
        return;
      }

      // Moving within same column or to different position
      const overCard = boardCards.find(c => c.id === overId);
      if (overCard && activeCard.id !== overCard.id) {
        const isSameColumn = activeCard.columnId === overCard.columnId;
        
        if (isSameColumn) {
          // Reorder within same column
          const columnCards = boardCards
            .filter(c => c.columnId === activeCard.columnId)
            .sort((a, b) => a.order - b.order);
          
          const activeIndex = columnCards.findIndex(c => c.id === activeCard.id);
          const overIndex = columnCards.findIndex(c => c.id === overCard.id);
          
          if (activeIndex !== -1 && overIndex !== -1) {
            const reorderedCards = arrayMove(columnCards, activeIndex, overIndex);
            
            // Update orders for all affected cards
            const updates = reorderedCards.map((card, index) => ({
              id: card.id,
              order: (index + 1) * 100
            }));
            
            for (const update of updates) {
              await taskly.updateCard(update.id, { order: update.order });
            }
          }
        } else {
          // Move to different column
          await taskly.updateCard(activeCard.id, { 
            columnId: overCard.columnId, 
            order: overCard.order + 50 
          });
        }
      }
    }

    // Handle column reordering
    if (dragData?.type === 'column') {
      const activeColumn = boardColumns.find(c => c.id === activeId);
      const overColumn = boardColumns.find(c => c.id === overId);
      
      if (activeColumn && overColumn && activeColumn.id !== overColumn.id) { // Fixed: Add null checks
        const activeIndex = boardColumns.findIndex(c => c.id === activeColumn.id);
        const overIndex = boardColumns.findIndex(c => c.id === overColumn.id);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          const reorderedColumns = arrayMove(boardColumns, activeIndex, overIndex);
          
          // Update orders for all columns
          const updates = reorderedColumns.map((column, index) => ({
            id: column.id,
            order: (index + 1) * 100
          }));
          
          for (const update of updates) {
            await taskly.updateColumn(update.id, { order: update.order });
          }
        }
      }
    }
  }, [dragData, currentBoard, boardCards, boardColumns, taskly]);

  // Handle adding new column
  const handleAddColumn = useCallback(async () => {
    if (!newColumnTitle.trim() || !currentBoard) return;
    
    const maxOrder = boardColumns.length > 0 
      ? Math.max(...boardColumns.map(c => c.order)) 
      : 0;
    
    await taskly.createColumn(currentBoard.id, newColumnTitle.trim(), maxOrder + 100);
    setNewColumnTitle('');
    setIsAddingColumn(false);
  }, [newColumnTitle, currentBoard, boardColumns, taskly]);

  // Handle keyboard submit for new column
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setIsAddingColumn(false);
      setNewColumnTitle('');
    }
  }, [handleAddColumn]);

  if (!currentBoard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">No Board Selected</h2>
          <p className="text-muted-foreground">Select a board from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Board Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/20">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{currentBoard.title}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Personal</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Updated today</span>
              </div>
              {archivedCardsCount > 0 && (
                <div className="flex items-center gap-1">
                  <Archive className="w-4 h-4" />
                  <span>{archivedCardsCount} archived</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {archivedCardsCount > 0 && (
            <button
              onClick={() => {/* TODO: Show archived cards */}}
              className="btn-secondary flex items-center gap-2"
            >
              <ArchiveRestore className="w-4 h-4" />
              <span>View Archived ({archivedCardsCount})</span>
            </button>
          )}
          
          <button
            onClick={() => {/* TODO: Board settings */}}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="h-full p-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full min-w-max">
              <SortableContext items={boardColumns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                {boardColumns.map((column) => (
                  <ColumnComponent
                    key={column.id}
                    column={column}
                    cards={boardCards.filter(card => card.columnId === column.id)}
                  />
                ))}
              </SortableContext>

              {/* Add Column Button/Form */}
              <div className="flex-shrink-0">
                {isAddingColumn ? (
                  <div className="w-80 bg-secondary/30 rounded-xl p-4 border border-border/20">
                    <input
                      type="text"
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={() => {
                        if (!newColumnTitle.trim()) {
                          setIsAddingColumn(false);
                        }
                      }}
                      placeholder="Enter column title..."
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleAddColumn}
                        disabled={!newColumnTitle.trim()}
                        className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50"
                      >
                        Add Column
                      </button>
                      <button
                        onClick={() => {
                          setIsAddingColumn(false);
                          setNewColumnTitle('');
                        }}
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="w-80 h-fit bg-secondary/30 border-2 border-dashed border-border/40 rounded-xl p-4 text-center hover:bg-secondary/50 hover:border-border/60 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-foreground">
                      <Plus className="w-5 h-5" />
                      <span className="font-medium">Add Column</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Drag Overlays */}
            <DragOverlay>
              {dragData?.type === 'card' && (
                <CardDragOverlay card={dragData.card} />
              )}
              {dragData?.type === 'column' && (
                <ColumnDragOverlay 
                  column={dragData.column}
                  cards={boardCards.filter(card => card.columnId === dragData.column.id)}
                />
              )}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Card Modal */}
      <CardModal />
    </div>
  );
}