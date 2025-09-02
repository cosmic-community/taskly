'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Edit3, Trash2 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import Card from './Card';
import type { Column as ColumnType, Card as CardType } from '@/types';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
}

export default function Column({ column, cards }: ColumnProps) {
  const taskly = useTaskly();
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingColumnTitle, setEditingColumnTitle] = useState(false);
  const [columnTitle, setColumnTitle] = useState(column.title);

  const {
    attributes,
    listeners,
    setNodeRef,
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Sort cards by order
  const sortedCards = cards.sort((a, b) => a.order - b.order);

  const handleCreateCard = async () => {
    if (!newCardTitle.trim()) return;

    try {
      await taskly.createCard(column.boardId, column.id, newCardTitle.trim());
      setNewCardTitle('');
      setIsCreatingCard(false);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const handleUpdateColumnTitle = async () => {
    if (!columnTitle.trim()) {
      setColumnTitle(column.title);
      setEditingColumnTitle(false);
      return;
    }

    try {
      await taskly.updateColumn(column.id, { title: columnTitle.trim() });
      setEditingColumnTitle(false);
    } catch (error) {
      console.error('Failed to update column title:', error);
    }
  };

  const handleDeleteColumn = async () => {
    if (cards.length > 0) {
      if (!confirm(`Delete column "${column.title}" and all ${cards.length} cards in it? This action cannot be undone.`)) {
        return;
      }
    } else {
      if (!confirm(`Delete column "${column.title}"? This action cannot be undone.`)) {
        return;
      }
    }

    try {
      await taskly.deleteColumn(column.id);
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex-shrink-0 w-80 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="glass-light border border-border/20 rounded-xl overflow-hidden">
        {/* Column Header */}
        <div
          className="p-4 border-b border-border/20 cursor-grab active:cursor-grabbing group"
          {...attributes}
          {...listeners}
        >
          <div className="flex items-center justify-between">
            {editingColumnTitle ? (
              <input
                type="text"
                value={columnTitle}
                onChange={(e) => setColumnTitle(e.target.value)}
                onBlur={handleUpdateColumnTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateColumnTitle();
                  if (e.key === 'Escape') {
                    setColumnTitle(column.title);
                    setEditingColumnTitle(false);
                  }
                }}
                className="font-semibold text-foreground bg-transparent border-b border-primary focus:outline-none min-w-0"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{column.title}</h3>
                <button
                  onClick={() => {
                    setColumnTitle(column.title);
                    setEditingColumnTitle(true);
                  }}
                  className="p-1 hover:bg-secondary/50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <Edit3 className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground bg-secondary/30 px-2 py-1 rounded-full">
                {cards.length}
              </span>
              
              <div className="relative group/menu">
                <button className="p-1 hover:bg-secondary/50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 w-40 bg-popover border border-border/20 rounded-lg shadow-card opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50">
                  <div className="p-1">
                    <button
                      onClick={handleDeleteColumn}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors duration-200"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Column
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cards Container */}
        <div className="p-4 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
          <SortableContext
            items={sortedCards.map(card => card.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedCards.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </SortableContext>

          {/* Add Card */}
          {isCreatingCard ? (
            <div className="space-y-2">
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                placeholder="Enter card title"
                className="w-full px-3 py-2 bg-background border border-border/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                rows={3}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateCard();
                  }
                  if (e.key === 'Escape') {
                    setIsCreatingCard(false);
                    setNewCardTitle('');
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateCard}
                  className="btn-primary text-sm py-2"
                  disabled={!newCardTitle.trim()}
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsCreatingCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn-ghost text-sm py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingCard(true)}
              className="w-full p-3 border border-dashed border-border/40 rounded-lg hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group"
            >
              <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Card</span>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}