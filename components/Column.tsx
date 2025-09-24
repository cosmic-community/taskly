'use client';

import { useState, useMemo } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Hash, Zap, Layers } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column } from '@/types';
import { useTaskly } from '@/lib/hooks';
import CardComponent from '@/components/Card';

interface ColumnProps {
  column: Column;
  taskly: ReturnType<typeof useTaskly>;
  labelFilter?: string[];
}

export default function ColumnComponent({ column, taskly, labelFilter = [] }: ColumnProps) {
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);

  const allCards = taskly.getColumnCards(column.id);
  
  // Filter cards based on label filter
  const cards = useMemo(() => {
    if (labelFilter.length === 0) {
      return allCards;
    }
    
    return allCards.filter(card => 
      card.labels && 
      labelFilter.some(selectedLabel => card.labels!.includes(selectedLabel))
    );
  }, [allCards, labelFilter]);
  
  const cardIds = cards.map(card => card.id);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `column-cards-${column.id}`,
    data: {
      type: 'column-cards',
      columnId: column.id,
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const handleCreateCard = () => {
    if (newCardTitle.trim()) {
      taskly.createCard(column.boardId, column.id, {
        title: newCardTitle.trim(),
      });
      setNewCardTitle('');
      setIsCreatingCard(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateCard();
    } else if (e.key === 'Escape') {
      setIsCreatingCard(false);
      setNewCardTitle('');
    }
  };

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle.trim() !== column.title) {
      taskly.updateColumn(column.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditedTitle(column.title);
      setIsEditingTitle(false);
    }
  };

  const handleDeleteColumn = () => {
    if (allCards.length > 0) {
      if (window.confirm(`Delete "${column.title}" and all ${allCards.length} cards in it?`)) {
        taskly.deleteColumn(column.id);
      }
    } else {
      taskly.deleteColumn(column.id);
    }
  };

  return (
    <div
      ref={setSortableNodeRef}
      style={style}
      className="flex-shrink-0 w-80 animate-liquid-in"
    >
      <div className="glass border border-border/10 rounded-3xl shadow-glass overflow-visible backdrop-blur-3xl">
        {/* Enhanced Column Header */}
        <div
          {...attributes}
          {...listeners}
          className="p-5 cursor-grab active:cursor-grabbing bg-gradient-surface border-b border-border/10 relative overflow-visible rounded-t-3xl"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-3xl" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 bg-gradient-primary rounded-2xl shadow-glow">
                <Layers className="w-4 h-4 text-white" />
              </div>
              
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyPress}
                  onBlur={handleTitleSubmit}
                  className="text-sm font-bold bg-transparent border-none outline-none flex-1 text-foreground font-display"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="text-sm font-bold text-foreground flex-1 font-display">
                  {column.title}
                </h3>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
                labelFilter.length > 0 && cards.length !== allCards.length
                  ? 'bg-warning/15 text-warning border-warning/20 shadow-glow-accent'
                  : 'bg-primary/15 text-primary border-primary/20'
              }`}>
                <div className="p-1 bg-current rounded-lg opacity-20">
                  <Zap className="w-2.5 h-2.5" />
                </div>
                <span className="text-xs font-bold">
                  {labelFilter.length > 0 && cards.length !== allCards.length 
                    ? `${cards.length}/${allCards.length}`
                    : cards.length
                  }
                </span>
              </div>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnMenu(!showColumnMenu);
                  }}
                  className="p-2.5 hover:bg-surface/50 rounded-2xl transition-all duration-300 hover:scale-105"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showColumnMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-3 w-48 glass-thick border border-border/20 rounded-3xl shadow-glass z-[9999] overflow-hidden backdrop-blur-strong">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingTitle(true);
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-5 py-4 text-left text-sm hover:bg-surface/30 transition-all duration-300 flex items-center gap-3"
                      >
                        <div className="p-1.5 bg-primary/20 rounded-xl">
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span>Rename</span>
                      </button>
                      <div className="h-px bg-border/10 mx-3" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn();
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-5 py-4 text-left text-sm text-destructive hover:bg-destructive/10 transition-all duration-300 flex items-center gap-3"
                      >
                        <div className="p-1.5 bg-destructive/20 rounded-xl">
                          <Trash2 className="w-3.5 h-3.5" />
                        </div>
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Cards Area */}
        <div 
          ref={setDroppableNodeRef}
          className="p-5 min-h-[320px] space-y-4"
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card, index) => (
              <div key={card.id} className="animate-liquid-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <CardComponent 
                  card={card} 
                  onClick={() => taskly.selectCard(card.id)}
                />
              </div>
            ))}
          </SortableContext>

          {/* Filter message with enhanced styling */}
          {labelFilter.length > 0 && cards.length === 0 && allCards.length > 0 && (
            <div className="p-5 text-center text-muted-foreground border-2 border-dashed border-muted/30 rounded-3xl bg-gradient-card backdrop-blur-sm">
              <div className="text-sm font-medium">No cards match the current filter</div>
              <div className="text-xs mt-1 opacity-75">{allCards.length} card{allCards.length !== 1 ? 's' : ''} in this column</div>
            </div>
          )}

          {/* Enhanced Add Card */}
          {isCreatingCard ? (
            <div className="p-5 bg-gradient-card border-2 border-dashed border-primary/30 rounded-3xl animate-liquid-scale backdrop-blur-sm shadow-glass-subtle">
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newCardTitle.trim()) {
                    setIsCreatingCard(false);
                  }
                }}
                placeholder="Enter card title..."
                className="w-full text-sm bg-transparent border-none outline-none placeholder-muted-foreground resize-none text-foreground"
                rows={2}
                autoFocus
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleCreateCard}
                  className="btn-primary text-sm px-5 py-2.5"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsCreatingCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn-secondary text-sm px-5 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingCard(true)}
              className="group w-full p-5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface/20 border-2 border-dashed border-muted/30 hover:border-primary/40 rounded-3xl transition-all duration-500 flex items-center justify-center gap-3 hover:scale-[1.02] backdrop-blur-sm"
            >
              <div className="p-2.5 bg-gradient-primary rounded-2xl opacity-70 group-hover:opacity-100 transition-all duration-300 shadow-glow group-hover:scale-110">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium">Add a card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}