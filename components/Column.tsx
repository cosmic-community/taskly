'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit2, Archive } from 'lucide-react';
import { useDroppable, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskly } from '@/lib/hooks';
import { Column as ColumnType, Card as CardType, ColumnDragData, ColumnCardsDragData } from '@/types';
import Card from './Card';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
  onDeleteColumn: (columnId: string) => void;
  onCreateCard: (columnId: string, title: string) => Promise<void>;
}

export default function Column({ column, cards, onDeleteColumn, onCreateCard }: ColumnProps) {
  const taskly = useTaskly();
  const [showNewCard, setShowNewCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: columnIsDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'column',
      column,
    } as ColumnDragData,
  });

  const {
    setNodeRef: setDroppableRef,
    isOver,
  } = useDroppable({
    id: `column-cards-${column.id}`,
    data: {
      type: 'column-cards',
      columnId: column.id,
    } as ColumnCardsDragData,
  });

  const columnStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCreateCard = async () => {
    if (newCardTitle.trim()) {
      await onCreateCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setShowNewCard(false);
    }
  };

  const handleCardClick = (card: CardType) => {
    taskly.selectCard(card);
  };

  const sortedCards = cards.sort((a, b) => a.order - b.order);

  if (columnIsDragging) {
    return (
      <div
        ref={setSortableRef}
        style={columnStyle}
        className="w-80 h-fit bg-card/50 border border-dashed border-primary/50 rounded-xl opacity-50"
      >
        <div className="p-4 h-20" />
      </div>
    );
  }

  return (
    <div
      ref={setSortableRef}
      style={columnStyle}
      className="flex-shrink-0 w-80"
    >
      <div
        ref={setDroppableRef}
        className={`bg-card border border-border/20 rounded-xl transition-all duration-200 ${
          isOver ? 'ring-2 ring-primary/50 bg-primary/5' : ''
        }`}
      >
        {/* Column Header */}
        <div
          className="flex items-center justify-between p-4 border-b border-border/20 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-foreground">{column.title}</h3>
            <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              {cards.length}
            </span>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 bg-popover border border-border/20 rounded-lg shadow-lg z-10 min-w-[140px] animate-fade-in">
                <button
                  onClick={() => {
                    // Edit column functionality
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onDeleteColumn(column.id);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="p-4 space-y-3 min-h-[100px]">
          {sortedCards.map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card)}
            />
          ))}

          {/* New Card Input */}
          {showNewCard ? (
            <div className="space-y-3">
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter card title"
                className="input-modern resize-none"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateCard();
                  } else if (e.key === 'Escape') {
                    setShowNewCard(false);
                    setNewCardTitle('');
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCard}
                  className="btn-primary text-sm"
                  disabled={!newCardTitle.trim()}
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setShowNewCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCard(true)}
              className="w-full flex items-center gap-2 p-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg border-2 border-dashed border-border/30 hover:border-border/50 transition-all group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Add a card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}