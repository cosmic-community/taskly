'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  MoreHorizontal, 
  Archive, 
  Trash2, 
  Edit3, 
  Grid3x3,
  Search,
  Filter,
  Users,
  Calendar,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useTaskly } from '@/lib/hooks';
import { Column as ColumnType, Card, Column } from '@/types';
import Column from './Column';
import Card as CardComponent from './Card';
import CardDragOverlay from './CardDragOverlay';
import ColumnDragOverlay from './ColumnDragOverlay';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null);
  const [dragType, setDragType] = useState<'card' | 'column' | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Get the selected board
  const selectedBoard = taskly.appState.boards.find(
    board => board.id === taskly.uiState.selectedBoardId
  );

  // Get columns for the selected board
  const boardColumns = taskly.appState.columns
    .filter(column => column.boardId === taskly.uiState.selectedBoardId)
    .sort((a, b) => a.order - b.order);

  // Get cards for the selected board
  const boardCards = taskly.appState.cards.filter(
    card => card.boardId === taskly.uiState.selectedBoardId
  );

  // Filter cards based on search and archived status
  const filteredCards = boardCards.filter(card => {
    const matchesSearch = card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (card.description && card.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArchived = showArchived ? card.isArchived : !card.isArchived;
    return matchesSearch && matchesArchived;
  });

  // Group cards by column
  const cardsByColumn = filteredCards.reduce((acc, card) => {
    if (!acc[card.columnId]) {
      acc[card.columnId] = [];
    }
    acc[card.columnId].push(card);
    return acc;
  }, {} as Record<string, Card[]>);

  // Sort cards within each column
  Object.keys(cardsByColumn).forEach(columnId => {
    cardsByColumn[columnId].sort((a, b) => a.order - b.order);
  });

  useEffect(() => {
    // Load board data if not already loaded
    if (taskly.uiState.selectedBoardId && !selectedBoard) {
      taskly.refreshData();
    }
  }, [taskly.uiState.selectedBoardId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current;

    if (data?.type === 'card') {
      setActiveCard(data.card);
      setDragType('card');
    } else if (data?.type === 'column') {
      setActiveColumn(data.column);
      setDragType('column');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle card drag and drop
    if (dragType === 'card' && activeData?.type === 'card') {
      const activeCard = activeData.card as Card;
      
      if (overData?.type === 'column' || overData?.type === 'column-cards') {
        const destinationColumnId = overData.type === 'column' 
          ? overData.column.id 
          : overData.columnId;
        
        if (activeCard.columnId !== destinationColumnId) {
          // Move card to different column
          const destinationCards = cardsByColumn[destinationColumnId] || [];
          const newOrder = Math.max(...destinationCards.map(c => c.order), 0) + 1;
          
          await taskly.moveCard(activeCard.id, destinationColumnId, newOrder);
        }
      }
    }

    // Handle column reordering
    if (dragType === 'column' && activeData?.type === 'column' && overData?.type === 'column') {
      const activeColumn = activeData.column as ColumnType;
      const overColumn = overData.column as ColumnType;
      
      if (activeColumn.id !== overColumn.id) {
        const activeIndex = boardColumns.findIndex(col => col.id === activeColumn.id);
        const overIndex = boardColumns.findIndex(col => col.id === overColumn.id);
        
        const reorderedColumns = [...boardColumns];
        const [movedColumn] = reorderedColumns.splice(activeIndex, 1);
        reorderedColumns.splice(overIndex, 0, movedColumn);
        
        // Update order values
        const updatedColumns = reorderedColumns.map((col, index) => ({
          ...col,
          order: index,
        }));
        
        await taskly.reorderColumns(selectedBoard!.id, updatedColumns);
      }
    }

    // Clear drag state
    setActiveCard(null);
    setActiveColumn(null);
    setDragType(null);
  };

  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim() || !selectedBoard) return;

    try {
      setIsCreatingColumn(true);
      await taskly.createColumn(selectedBoard.id, newColumnTitle.trim());
      setNewColumnTitle('');
    } catch (error) {
      console.error('Failed to create column:', error);
    } finally {
      setIsCreatingColumn(false);
    }
  };

  if (!selectedBoard) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Grid3x3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-muted-foreground mb-2">No Board Selected</h2>
          <p className="text-muted-foreground mb-4">Select a board to view its columns and cards</p>
          <button
            onClick={() => taskly.setCurrentView('boards')}
            className="btn-primary"
          >
            View Boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => taskly.setCurrentView('boards')}
                className="btn-ghost p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Grid3x3 className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{selectedBoard.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {boardColumns.length} columns • {boardCards.filter(c => !c.isArchived).length} cards
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-modern pl-10 w-64"
                />
              </div>

              {/* Filters */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`btn-ghost p-2 ${showArchived ? 'bg-accent text-accent-foreground' : ''}`}
                title={showArchived ? 'Hide archived cards' : 'Show archived cards'}
              >
                <Archive className="w-4 h-4" />
              </button>

              <button className="btn-ghost p-2" title="Board settings">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full overflow-x-auto pb-6">
            <SortableContext items={boardColumns.map(col => col.id)} strategy={horizontalListSortingStrategy}>
              {boardColumns.map((col: Column) => {
                const columnCards = cardsByColumn[col.id] || [];
                
                return (
                  <Column
                    key={col.id}
                    column={col}
                    cards={columnCards}
                    onUpdateColumn={taskly.updateColumn}
                    onDeleteColumn={taskly.deleteColumn}
                    onCreateCard={taskly.createCard}
                    onUpdateCard={taskly.updateCard}
                    onDeleteCard={taskly.deleteCard}
                  />
                );
              })}
            </SortableContext>

            {/* Create Column */}
            <div className="flex-shrink-0 w-80">
              <form onSubmit={handleCreateColumn} className="glass-subtle border-dashed border-2 border-border/30 rounded-2xl p-6 h-fit">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Plus className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Add Column</h3>
                </div>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Enter column title..."
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    className="input-modern w-full"
                    disabled={isCreatingColumn}
                  />
                  
                  <button
                    type="submit"
                    disabled={!newColumnTitle.trim() || isCreatingColumn}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {isCreatingColumn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create Column
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Drag Overlays */}
          <DragOverlay>
            {activeCard && dragType === 'card' && (
              <CardDragOverlay card={activeCard} />
            )}
            {activeColumn && dragType === 'column' && (
              <ColumnDragOverlay column={activeColumn} />
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Board Stats */}
      <div className="border-t border-border/40 bg-card/30 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span>{boardCards.filter(c => !c.isArchived).length} Active Cards</span>
            </div>
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-muted-foreground" />
              <span>{boardCards.filter(c => c.isArchived).length} Archived</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              <span>{boardCards.filter(c => c.dueDate && !c.isArchived).length} With Due Dates</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Updated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}