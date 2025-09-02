'use client';

import { useState, useMemo } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, ArrowLeft, MoreHorizontal, Archive, Trash2, Edit3 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import Column from './Column';
import Card from './Card';
import CardDragOverlay from './CardDragOverlay';
import ColumnDragOverlay from './ColumnDragOverlay';
import type { DragStartEvent, DragEndEvent, Column as ColumnType, Card as CardType } from '@/types';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');

  // Get current board
  const currentBoard = useMemo(() => {
    if (!taskly.uiState.selectedBoardId) return null;
    return taskly.appState.boards.find(board => board.id === taskly.uiState.selectedBoardId) || null;
  }, [taskly.appState.boards, taskly.uiState.selectedBoardId]);

  // Get columns for current board, sorted by order
  const boardColumns = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.appState.columns
      .filter(column => column.boardId === currentBoard.id)
      .sort((a, b) => a.order - b.order);
  }, [taskly.appState.columns, currentBoard]);

  // Get cards for current board
  const boardCards = useMemo(() => {
    if (!currentBoard) return [];
    return taskly.appState.cards.filter(card => card.boardId === currentBoard.id);
  }, [taskly.appState.cards, currentBoard]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  if (!currentBoard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Board not found</h2>
          <p className="text-muted-foreground mb-4">The board you're looking for doesn't exist.</p>
          <button
            onClick={() => taskly.setCurrentView('boards')}
            className="btn-primary"
          >
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle card drag
    if (active.data.current?.type === 'card') {
      const activeCard = boardCards.find(card => card.id === activeId);
      if (!activeCard) return;

      // Dropping on a column
      if (over.data.current?.type === 'column') {
        const overColumn = boardColumns.find(col => col.id === overId);
        if (!overColumn) return;

        // Move card to new column
        if (activeCard.columnId !== overColumn.id) {
          const columnCards = boardCards.filter(card => card.columnId === overColumn.id);
          const newOrder = Math.max(...columnCards.map(card => card.order), 0) + 1;
          await taskly.moveCard(activeCard.id, overColumn.id, newOrder);
        }
      }
      // Dropping on another card
      else if (over.data.current?.type === 'card') {
        const overCard = boardCards.find(card => card.id === overId);
        if (!overCard || activeCard.columnId !== overCard.columnId) return;

        // Reorder cards within the same column
        const columnCards = boardCards
          .filter(card => card.columnId === activeCard.columnId)
          .sort((a, b) => a.order - b.order);

        const activeIndex = columnCards.findIndex(card => card.id === activeId);
        const overIndex = columnCards.findIndex(card => card.id === overId);

        if (activeIndex !== overIndex) {
          const reorderedCards = [...columnCards];
          const [removed] = reorderedCards.splice(activeIndex, 1);
          reorderedCards.splice(overIndex, 0, removed);

          // Update orders
          const updatedCards = reorderedCards.map((card, index) => ({
            ...card,
            order: index,
          }));

          await taskly.reorderCards(activeCard.columnId, updatedCards);
        }
      }
    }
    // Handle column drag
    else if (active.data.current?.type === 'column') {
      if (activeId === overId) return;

      const activeIndex = boardColumns.findIndex(col => col.id === activeId);
      const overIndex = boardColumns.findIndex(col => col.id === overId);

      if (activeIndex !== -1 && overIndex !== -1) {
        const reorderedColumns = [...boardColumns];
        const [removed] = reorderedColumns.splice(activeIndex, 1);
        reorderedColumns.splice(overIndex, 0, removed);

        // Update orders
        const updatedColumns = reorderedColumns.map((column, index) => ({
          ...column,
          order: index,
        }));

        await taskly.reorderColumns(currentBoard.id, updatedColumns);
      }
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnTitle.trim()) return;

    try {
      await taskly.createColumn(currentBoard.id, newColumnTitle.trim());
      setNewColumnTitle('');
      setIsCreatingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const handleUpdateBoardTitle = async () => {
    if (!boardTitle.trim()) {
      setBoardTitle(currentBoard.title);
      setEditingBoardTitle(false);
      return;
    }

    try {
      await taskly.updateBoard(currentBoard.id, { title: boardTitle.trim() });
      setEditingBoardTitle(false);
    } catch (error) {
      console.error('Failed to update board title:', error);
    }
  };

  const handleDeleteBoard = async () => {
    if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      try {
        await taskly.deleteBoard(currentBoard.id);
        taskly.setCurrentView('boards');
      } catch (error) {
        console.error('Failed to delete board:', error);
      }
    }
  };

  const handleArchiveBoard = async () => {
    try {
      await taskly.updateBoard(currentBoard.id, { isArchived: !currentBoard.isArchived });
    } catch (error) {
      console.error('Failed to archive board:', error);
    }
  };

  // Get active item for drag overlay - Fix: Add proper null checks
  const activeColumn = activeId ? boardColumns.find(col => col.id === activeId) : null;
  const activeCard = activeId ? boardCards.find(card => card.id === activeId) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => taskly.setCurrentView('boards')}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-colors duration-200 group"
              >
                <ArrowLeft className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
              </button>
              
              {editingBoardTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    onBlur={handleUpdateBoardTitle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateBoardTitle();
                      if (e.key === 'Escape') {
                        setBoardTitle(currentBoard.title);
                        setEditingBoardTitle(false);
                      }
                    }}
                    className="text-2xl font-bold bg-transparent border-b-2 border-primary focus:outline-none min-w-0"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">{currentBoard.title}</h1>
                  <button
                    onClick={() => {
                      setBoardTitle(currentBoard.title);
                      setEditingBoardTitle(true);
                    }}
                    className="p-1 hover:bg-secondary/50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Edit3 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              )}

              {currentBoard.isArchived && (
                <span className="px-3 py-1 bg-warning/10 text-warning text-sm rounded-full border border-warning/20">
                  Archived
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group">
                <button className="p-2 hover:bg-secondary/50 rounded-lg transition-colors duration-200">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border/20 rounded-lg shadow-card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-1">
                    <button
                      onClick={handleArchiveBoard}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-secondary/50 rounded-md transition-colors duration-200"
                    >
                      <Archive className="w-4 h-4" />
                      {currentBoard.isArchived ? 'Unarchive Board' : 'Archive Board'}
                    </button>
                    <button
                      onClick={handleDeleteBoard}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Board
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-h-[calc(100vh-200px)]">
            <SortableContext
              items={boardColumns.map(col => col.id)}
              strategy={horizontalListSortingStrategy}
            >
              {boardColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={boardCards.filter(card => card.columnId === column.id)}
                />
              ))}
            </SortableContext>

            {/* Add Column */}
            {isCreatingColumn ? (
              <div className="flex-shrink-0 w-80">
                <div className="glass-light border border-border/20 rounded-xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title"
                    className="w-full px-3 py-2 bg-background border border-border/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateColumn();
                      if (e.key === 'Escape') {
                        setIsCreatingColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleCreateColumn}
                      className="btn-primary text-sm py-2"
                      disabled={!newColumnTitle.trim()}
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-ghost text-sm py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingColumn(true)}
                className="flex-shrink-0 w-80 h-fit glass-light border border-dashed border-border/40 rounded-xl p-6 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Add Column</span>
                </div>
              </button>
            )}
          </div>

          {/* Drag Overlays - Fix: Only render components when items exist and are defined */}
          <DragOverlay>
            {activeColumn ? <ColumnDragOverlay column={activeColumn} /> : null}
            {activeCard ? <CardDragOverlay card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}