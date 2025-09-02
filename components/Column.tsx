'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, GripVertical, Edit3, Trash2, Archive, Loader2, CheckSquare, Calendar, Tag } from 'lucide-react';
import { Column as ColumnType, Card } from '@/types';
import Card as CardComponent from './Card';

interface ColumnProps {
  column: ColumnType;
  cards: Card[];
  onUpdateColumn: (id: string, updates: Partial<Pick<ColumnType, 'title' | 'order'>>) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
  onCreateCard: (boardId: string, columnId: string, title: string, description?: string) => Promise<Card>;
  onUpdateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => Promise<void>;
  onDeleteCard: (id: string) => Promise<void>;
}

export default function Column({
  column,
  cards,
  onUpdateColumn,
  onDeleteColumn,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
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

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: `column-cards-${column.id}`,
    data: {
      type: 'column-cards',
      columnId: column.id,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== column.title) {
      await onUpdateColumn(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDeleteColumn = async () => {
    if (cards.length > 0) {
      const confirmed = confirm(
        `This column contains ${cards.length} card(s). Are you sure you want to delete it? This will also delete all cards in this column.`
      );
      if (!confirmed) return;
    } else {
      const confirmed = confirm('Are you sure you want to delete this column?');
      if (!confirmed) return;
    }
    
    await onDeleteColumn(column.id);
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;

    try {
      setIsCreatingCard(true);
      await onCreateCard(column.boardId, column.id, newCardTitle.trim());
      setNewCardTitle('');
    } finally {
      setIsCreatingCard(false);
    }
  };

  // Statistics
  const totalCards = cards.length;
  const completedCards = cards.filter(card => card.isArchived).length;
  const cardsWithDueDate = cards.filter(card => card.dueDate && !card.isArchived).length;
  const overdueCards = cards.filter(card => {
    return card.dueDate && !card.isArchived && new Date(card.dueDate) < new Date();
  }).length;

  return (
    <div
      ref={setSortableRef}
      style={style}
      className="flex-shrink-0 w-80 bg-card/40 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm"
    >
      {/* Column Header */}
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center justify-between mb-3">
          {isEditing ? (
            <div className="flex-1 mr-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setEditTitle(column.title);
                    setIsEditing(false);
                  }
                }}
                className="input-modern w-full font-semibold"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-semibold text-foreground text-lg">{column.title}</h3>
              <span className="text-xs bg-secondary/50 text-muted-foreground px-2 py-1 rounded-full">
                {totalCards}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="btn-ghost p-2 hover:bg-secondary/50"
              title="Edit column title"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="btn-ghost p-2 hover:bg-secondary/50"
                title="Column options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute top-full right-0 mt-1 bg-card border border-border/20 rounded-xl shadow-lg z-10 min-w-[160px] animate-fade-in">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleDeleteColumn();
                    }}
                    className="w-full text-left px-4 py-3 text-destructive hover:bg-destructive/10 rounded-xl transition-colors duration-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Column
                  </button>
                </div>
              )}
            </div>

            <div
              {...attributes}
              {...listeners}
              className="btn-ghost p-2 cursor-grab hover:bg-secondary/50"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Column Stats */}
        {totalCards > 0 && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" />
              <span>{completedCards} done</span>
            </div>
            {cardsWithDueDate > 0 && (
              <div className="flex items-center gap-1">
                <Calendar className={`w-3 h-3 ${overdueCards > 0 ? 'text-destructive' : ''}`} />
                <span className={overdueCards > 0 ? 'text-destructive' : ''}>
                  {cardsWithDueDate} scheduled
                  {overdueCards > 0 && ` (${overdueCards} overdue)`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards Area */}
      <div
        ref={setDroppableRef}
        className="flex-1 p-4 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto"
      >
        {cards.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-muted-foreground">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No cards yet</p>
              <p className="text-xs opacity-70">Add your first card below</p>
            </div>
          </div>
        ) : (
          cards.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              onUpdateCard={onUpdateCard}
              onDeleteCard={onDeleteCard}
            />
          ))
        )}
      </div>

      {/* Add Card Form */}
      <div className="p-4 border-t border-border/10">
        <form onSubmit={handleCreateCard}>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add a card..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              className="input-modern flex-1 text-sm"
              disabled={isCreatingCard}
            />
            
            <button
              type="submit"
              disabled={!newCardTitle.trim() || isCreatingCard}
              className="btn-primary px-4 py-2 flex items-center gap-2"
            >
              {isCreatingCard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}