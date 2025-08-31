'use client';

import { useState, useMemo } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Hash, Zap } from 'lucide-react';
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
    opacity: isDragging ? 0.6 : 1,
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
      className="flex-shrink-0 w-80"
    >
      <div className="glass-light border border-border/20 rounded-2xl shadow-card overflow-hidden">
        {/* Column Header */}
        <div
          {...attributes}
          {...listeners}
          className="p-4 cursor-grab active:cursor-grabbing bg-gradient-to-r from-secondary/50 to-secondary/30 border-b border-border/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-1.5 bg-gradient-primary rounded-lg shadow-glow">
                <Hash className="w-3 h-3 text-white" />
              </div>
              
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleTitleKeyPress}
                  onBlur={handleTitleSubmit}
                  className="text-sm font-bold bg-transparent border-none outline-none flex-1 text-foreground"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h3 className="text-sm font-bold text-foreground flex-1">
                  {column.title}
                </h3>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                labelFilter.length > 0 && cards.length !== allCards.length
                  ? 'bg-warning/20 text-warning border-warning/20'
                  : 'bg-primary/20 text-primary border-primary/20'
              }`}>
                <Zap className="w-3 h-3" />
                <span className="text-xs font-semibold">
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
                  className="p-2 hover:bg-secondary/50 rounded-lg transition-colors duration-200"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showColumnMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-44 glass border border-border/30 rounded-xl shadow-card z-20 overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingTitle(true);
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors duration-200 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4 text-primary" />
                        <span>Rename</span>
                      </button>
                      <div className="h-px bg-border/20" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn();
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cards Area */}
        <div 
          ref={setDroppableNodeRef}
          className="p-4 min-h-[300px] space-y-3"
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card, index) => (
              <div key={card.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <CardComponent 
                  card={card} 
                  onClick={() => taskly.selectCard(card.id)}
                />
              </div>
            ))}
          </SortableContext>

          {/* Show message if cards are filtered out */}
          {labelFilter.length > 0 && cards.length === 0 && allCards.length > 0 && (
            <div className="p-4 text-center text-muted-foreground border-2 border-dashed border-muted rounded-xl">
              <div className="text-sm">No cards match the current label filter</div>
              <div className="text-xs mt-1 opacity-75">{allCards.length} card{allCards.length !== 1 ? 's' : ''} in this column</div>
            </div>
          )}

          {/* Add Card */}
          {isCreatingCard ? (
            <div className="p-4 bg-gradient-card border-2 border-dashed border-primary/50 rounded-xl animate-scale-in">
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
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCreateCard}
                  className="btn-primary text-xs"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsCreatingCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingCard(true)}
              className="group w-full p-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 border-2 border-dashed border-muted hover:border-primary/50 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              <div className="p-1.5 bg-gradient-primary rounded-lg opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                <Plus className="w-3 h-3 text-white" />
              </div>
              <span className="font-medium">Add a card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}