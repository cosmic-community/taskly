'use client';

import { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { 
  ArrowLeft, 
  Plus, 
  Settings, 
  Archive,
  MoreHorizontal,
  Sparkles,
  Users,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board, Column, Card, DragStartEvent, DragEndEvent } from '@/types';
import ColumnComponent from '@/components/Column';
import CardDragOverlay from '@/components/CardDragOverlay';
import ColumnDragOverlay from '@/components/ColumnDragOverlay';

interface BoardPanelProps {
  board: Board;
}

export default function BoardPanel({ board }: BoardPanelProps) {
  const taskly = useTaskly();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'card' | 'column' | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get columns and cards for this board
  const boardColumns = taskly.columns
    .filter(col => col.boardId === board.id)
    .sort((a, b) => a.order - b.order);

  const boardCards = taskly.cards
    .filter(card => card.boardId === board.id && !card.isArchived)
    .sort((a, b) => a.order - b.order);

  // Filter cards based on search query
  const filteredCards = searchQuery 
    ? boardCards.filter(card => 
        card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.labels?.some(label => label.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : boardCards;

  // Load board data when component mounts
  useEffect(() => {
    if (board.id) {
      taskly.loadBoardData(board.id);
    }
  }, [board.id]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    setActiveId(active.id as string);
    
    if (activeData?.type === 'card') {
      setActiveType('card');
    } else if (activeData?.type === 'column') {
      setActiveType('column');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      setActiveType(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle card drag
    if (activeData?.type === 'card') {
      const activeCard = activeData.card as Card;
      
      if (overData?.type === 'column') {
        // Move card to different column
        const targetColumnId = overData.column.id;
        if (activeCard.columnId !== targetColumnId) {
          await taskly.moveCard(activeCard.id, targetColumnId, 0);
        }
      } else if (overData?.type === 'card') {
        // Reorder cards within same column or move to different column
        const overCard = overData.card as Card;
        const targetColumnId = overCard.columnId;
        const targetOrder = overCard.order;

        if (activeCard.id !== overCard.id) {
          await taskly.moveCard(activeCard.id, targetColumnId, targetOrder);
        }
      }
    }

    // Handle column drag
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeColumn = activeData.column as Column;
      const overColumn = overData.column as Column;

      if (activeColumn.id !== overColumn.id) {
        const oldIndex = boardColumns.findIndex(col => col.id === activeColumn.id);
        const newIndex = boardColumns.findIndex(col => col.id === overColumn.id);
        
        const reorderedColumns = arrayMove(boardColumns, oldIndex, newIndex);
        await taskly.reorderColumns(reorderedColumns.map((col, index) => ({
          id: col.id,
          order: index * 100,
        })));
      }
    }

    setActiveId(null);
    setActiveType(null);
  };

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim()) return;

    const maxOrder = Math.max(...boardColumns.map(col => col.order), -1);
    await taskly.createColumn(board.id, newColumnTitle.trim(), maxOrder + 100);
    
    setNewColumnTitle('');
    setIsAddingColumn(false);
  };

  const getCardsForColumn = (columnId: string) => {
    return filteredCards.filter(card => card.columnId === columnId);
  };

  // Get active card or column for drag overlay
  const activeCard = activeType === 'card' && activeId 
    ? boardCards.find(card => card.id === activeId) 
    : null;
  
  const activeColumn = activeType === 'column' && activeId 
    ? boardColumns.find(col => col.id === activeId) 
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="glass-light border-b border-border/20 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => taskly.setCurrentView('boards')}
                  className="p-2 hover:bg-secondary/30 rounded-xl transition-colors duration-200 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">{board.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Personal
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-modern pl-10 w-64"
                  />
                </div>

                {/* Actions */}
                <button className="p-2.5 hover:bg-secondary/30 rounded-xl transition-colors duration-200 text-muted-foreground hover:text-foreground">
                  <Filter className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-secondary/30 rounded-xl transition-colors duration-200 text-muted-foreground hover:text-foreground">
                  <Settings className="w-5 h-5" />
                </button>
                <button className="p-2.5 hover:bg-secondary/30 rounded-xl transition-colors duration-200 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Board Content */}
        <main className="p-6">
          <div className="flex gap-6 overflow-x-auto pb-6">
            {/* Existing Columns */}
            {boardColumns.map((column) => (
              <ColumnComponent
                key={column.id}
                column={column}
                cards={getCardsForColumn(column.id)}
              />
            ))}

            {/* Add Column */}
            <div className="flex-shrink-0 w-80">
              {isAddingColumn ? (
                <form onSubmit={handleAddColumn} className="glass-light border border-border/20 rounded-2xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title..."
                    className="input-modern w-full mb-3"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!newColumnTitle.trim()}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Column
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-ghost px-4"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="w-full glass-light border border-dashed border-border/40 rounded-2xl p-6 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                    <span className="font-medium">Add a column</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Drag Overlays */}
      <DragOverlay>
        {activeCard && <CardDragOverlay card={activeCard} />}
        {activeColumn && <ColumnDragOverlay column={activeColumn} />}
      </DragOverlay>
    </DndContext>
  );
}