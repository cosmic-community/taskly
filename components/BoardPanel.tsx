'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
  rectIntersection,
  pointerWithin,
} from '@dnd-kit/core';
import { Grid3X3, Settings, Archive, Star, Users, Clock, Plus, ArrowLeft } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { useTaskly } from '@/lib/hooks';
import { Card as CardType, Column as ColumnType, DragData } from '@/types';
import Column from './Column';
import CardDragOverlay from './CardDragOverlay';
import ColumnDragOverlay from './ColumnDragOverlay';
import CardModal from './CardModal';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [draggedCard, setDraggedCard] = useState<CardType | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<ColumnType | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showNewColumn, setShowNewColumn] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Get selected board and its data
  const selectedBoard = taskly.getSelectedBoard();
  const user = taskly.user;

  useEffect(() => {
    if (selectedBoard && user) {
      const boardId = selectedBoard.id;
      taskly.loadColumns(boardId);
      taskly.loadCards(boardId);
    }
  }, [selectedBoard?.id, user?.id]);

  if (!selectedBoard || !user) {
    return null;
  }

  const columns = taskly.appState.columns
    .filter((col: ColumnType) => col.boardId === selectedBoard.id)
    .sort((a: ColumnType, b: ColumnType) => a.order - b.order);

  const cards = taskly.appState.cards
    .filter((card: CardType) => card.boardId === selectedBoard.id)
    .filter((card: CardType) => !card.isArchived)
    .sort((a: ColumnType, b: ColumnType) => a.order - b.order);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const dragData = active.data.current as DragData;

    if (dragData?.type === 'card') {
      setDraggedCard(dragData.card);
    } else if (dragData?.type === 'column') {
      setDraggedColumn(dragData.column);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle card moving between columns
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current as DragData;
    const overData = over.data.current as DragData;

    // Handle column reordering
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeColumnIndex = columns.findIndex((col: ColumnType) => col.id === active.id);
      const overColumnIndex = columns.findIndex((col: ColumnType) => col.id === over.id);

      if (activeColumnIndex !== overColumnIndex) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
        // Update column orders
        newColumns.forEach((col: ColumnType, index: number) => {
          taskly.updateColumn(col.id, { order: index });
        });
      }
    }

    // Handle card moving
    if (activeData?.type === 'card') {
      const card = activeData.card;
      
      if (overData?.type === 'column' || overData?.type === 'column-cards') {
        const newColumnId = overData.type === 'column' ? overData.column.id : overData.columnId;
        
        if (card.columnId !== newColumnId) {
          taskly.updateCard(card.id, { columnId: newColumnId });
        }
      }
    }

    setDraggedCard(null);
    setDraggedColumn(null);
  };

  const handleCreateColumn = async () => {
    if (newColumnTitle.trim()) {
      await taskly.createColumn(selectedBoard.id, { title: newColumnTitle.trim() });
      setNewColumnTitle('');
      setShowNewColumn(false);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    await taskly.deleteColumn(columnId);
  };

  const handleCreateCard = async (columnId: string, title: string) => {
    await taskly.createCard(selectedBoard.id, columnId, { title });
  };

  const totalCards = cards.length;
  const completedCards = cards.filter((c: CardType) => {
    const completedColumn = columns.find((col: ColumnType) => 
      col.id === c.columnId && 
      (col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('complete'))
    );
    return completedColumn;
  }).length;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border/20 bg-card/50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => taskly.setCurrentView('boards')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Boards</span>
          </button>
          
          <div className="w-px h-6 bg-border/20" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Grid3X3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{selectedBoard.title}</h1>
              <p className="text-sm text-muted-foreground">
                {totalCards} cards • {completedCards} completed
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Personal</span>
          </div>
          
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Star className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Archive className="w-5 h-5" />
          </button>
          
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 p-6 h-full overflow-x-auto">
            {/* Existing Columns */}
            {columns.map((column: ColumnType) => (
              <Column
                key={column.id}
                column={column}
                cards={cards.filter((card: CardType) => card.columnId === column.id)}
                onDeleteColumn={handleDeleteColumn}
                onCreateCard={handleCreateCard}
              />
            ))}

            {/* New Column Input */}
            <div className="flex-shrink-0 w-80">
              {showNewColumn ? (
                <div className="bg-card border border-border/20 rounded-xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title"
                    className="input-modern mb-3"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleCreateColumn();
                      } else if (e.key === 'Escape') {
                        setShowNewColumn(false);
                        setNewColumnTitle('');
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateColumn}
                      className="btn-primary text-sm"
                      disabled={!newColumnTitle.trim()}
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setShowNewColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-ghost text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewColumn(true)}
                  className="w-full h-12 bg-card/30 hover:bg-card/50 border-2 border-dashed border-border/30 hover:border-border/50 rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Add another column</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag Overlays */}
          <DragOverlay>
            {draggedCard && <CardDragOverlay card={draggedCard} />}
            {draggedColumn && <ColumnDragOverlay column={draggedColumn} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Card Modal */}
      {taskly.selectedCard && <CardModal />}
    </div>
  );
}