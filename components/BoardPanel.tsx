'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Archive, 
  Trash2, 
  Edit3,
  MoreHorizontal,
  Users,
  Calendar,
  Filter,
  Search,
  Grid3x3,
  List,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import Column from './Column';
import { 
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import CardDragOverlay from './CardDragOverlay';
import ColumnDragOverlay from './ColumnDragOverlay';
import { Card, Column as ColumnType } from '@/types';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<ColumnType | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load board data when board is selected
  useEffect(() => {
    if (taskly.currentBoard && taskly.user) {
      taskly.loadBoards();
    }
  }, [taskly.currentBoard?.id, taskly.user]);

  // Get current board data
  const currentBoard = taskly.currentBoard;
  const boardColumns = taskly.appState.columns
    .filter(col => col.boardId === currentBoard?.id)
    .sort((a, b) => a.order - b.order);
  
  const boardCards = taskly.appState.cards
    .filter(card => card.boardId === currentBoard?.id)
    .filter(card => showArchived || !card.isArchived)
    .filter(card => !searchQuery || 
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (!currentBoard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">No board selected</h2>
          <p className="text-muted-foreground mb-4">Select a board to get started</p>
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

  const handleAddColumn = async () => {
    if (!newColumnTitle.trim() || !currentBoard) return;
    
    try {
      await taskly.createColumn(currentBoard.id, newColumnTitle.trim());
      setNewColumnTitle('');
      setIsAddingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  const handleUpdateBoardTitle = async () => {
    if (!editTitle.trim() || !currentBoard) return;
    
    try {
      await taskly.updateBoard(currentBoard.id, { title: editTitle.trim() });
      setIsEditingTitle(false);
    } catch (error) {
      console.error('Failed to update board title:', error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;
    
    if (activeData?.type === 'card') {
      setDraggedCard(activeData.card);
    } else if (activeData?.type === 'column') {
      setDraggedColumn(activeData.column);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDraggedCard(null);
    setDraggedColumn(null);
    
    if (!over || !currentBoard) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeIndex = boardColumns.findIndex(col => col.id === active.id);
      const overIndex = boardColumns.findIndex(col => col.id === over.id);
      
      if (activeIndex !== overIndex) {
        taskly.reorderColumns(currentBoard.id, activeIndex, overIndex);
      }
      return;
    }

    // Handle card movement
    if (activeData?.type === 'card') {
      const cardId = active.id as string;
      const card = boardCards.find(c => c.id === cardId);
      
      if (!card) return;

      let newColumnId = card.columnId;
      let newOrder = card.order;

      // Determine new column and position
      if (overData?.type === 'column') {
        newColumnId = over.id as string;
        // Place at the end of the column
        const cardsInColumn = boardCards.filter(c => c.columnId === newColumnId);
        newOrder = cardsInColumn.length > 0 ? Math.max(...cardsInColumn.map(c => c.order)) + 1 : 1;
      } else if (overData?.type === 'card') {
        const overCard = boardCards.find(c => c.id === over.id);
        if (overCard) {
          newColumnId = overCard.columnId;
          newOrder = overCard.order;
        }
      }

      // Only update if position changed
      if (newColumnId !== card.columnId || newOrder !== card.order) {
        taskly.moveCard(cardId, newColumnId, newOrder);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur">
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => taskly.selectBoard(null)}
                className="btn-ghost p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-3">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateBoardTitle()}
                      onBlur={handleUpdateBoardTitle}
                      className="input-modern text-xl font-bold"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-foreground">{currentBoard.title}</h1>
                    <button
                      onClick={() => {
                        setEditTitle(currentBoard.title);
                        setIsEditingTitle(true);
                      }}
                      className="btn-ghost p-1"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search cards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-secondary/30 border border-border/20 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/20"
                />
              </div>

              {/* View Toggle */}
              <div className="flex bg-secondary/30 rounded-lg p-1 border border-border/20">
                <button
                  onClick={() => setViewMode('board')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'board' 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Show Archived Toggle */}
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`btn-ghost flex items-center gap-2 ${
                  showArchived ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span className="text-sm">Archived</span>
              </button>

              {/* Add Column Button */}
              <button
                onClick={() => setIsAddingColumn(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Column
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-6">
            <SortableContext 
              items={boardColumns.map(col => col.id)}
              strategy={horizontalListSortingStrategy}
            >
              {/* Render Columns */}
              {boardColumns.map((column) => (
                <Column
                  key={column.id}
                  column={column}
                  cards={boardCards.filter(card => card.columnId === column.id)}
                />
              ))}
            </SortableContext>

            {/* Add Column Form */}
            {isAddingColumn && (
              <div className="w-80 flex-shrink-0">
                <div className="bg-card border border-border rounded-xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddColumn()}
                    placeholder="Enter column title..."
                    className="input-modern mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      disabled={!newColumnTitle.trim()}
                      className="btn-primary flex-1"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-ghost px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Drag Overlays */}
          <DragOverlay>
            {draggedCard && <CardDragOverlay card={draggedCard} />}
            {draggedColumn && <ColumnDragOverlay column={draggedColumn} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}