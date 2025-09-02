'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal, Trash2, Edit3, Archive } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import Card from './Card';
import type { Column as ColumnType, Card as CardType } from '@/types';

interface ColumnProps {
  column: ColumnType;
  cards: CardType[];
}

export default function Column({ column, cards }: ColumnProps) {
  const taskly = useTaskly();
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showNewCard, setShowNewCard] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      taskly.addCard(column.id, newCardTitle.trim());
      setNewCardTitle('');
      setShowNewCard(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isEditing) {
        handleSaveTitle();
      } else {
        handleAddCard();
      }
    } else if (e.key === 'Escape') {
      if (isEditing) {
        setIsEditing(false);
        setEditTitle(column.title);
      } else {
        setShowNewCard(false);
        setNewCardTitle('');
      }
    }
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== column.title) {
      taskly.updateColumn(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleDeleteColumn = () => {
    if (window.confirm(`Are you sure you want to delete "${column.title}" and all its cards?`)) {
      taskly.deleteColumn(column.id);
    }
  };

  const handleCardClick = (card: CardType) => {
    taskly.setSelectedCardId(card.id);
    taskly.setCurrentView('card');
  };

  return (
    <div className="min-w-80 max-w-80">
      <div className="glass-light border border-border/20 rounded-xl h-full flex flex-col">
        {/* Column Header */}
        <div className="p-4 border-b border-border/20">
          <div className="flex items-center justify-between mb-2">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleSaveTitle}
                className="input-modern text-sm font-semibold flex-1"
                autoFocus
              />
            ) : (
              <h3 
                className="font-bold text-foreground cursor-pointer hover:text-primary transition-colors duration-200 flex-1"
                onClick={() => setIsEditing(true)}
              >
                {column.title}
              </h3>
            )}
            
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 hover:bg-secondary/50 rounded-lg transition-colors duration-200 text-muted-foreground hover:text-foreground"
                aria-label="Column options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 top-full mt-2 bg-popover border border-border/20 rounded-xl shadow-lg py-2 z-10 min-w-48">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-secondary/50 flex items-center gap-3"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit title
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteColumn();
                      setShowOptions(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete column
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</span>
          </div>
        </div>

        {/* Cards List */}
        <div className="flex-1 p-4 space-y-3 min-h-32">
          {cards.map((card: CardType, index: number) => (
            <Card
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card)}
            />
          ))}

          {/* Add New Card */}
          {showNewCard ? (
            <div className="border-2 border-dashed border-border/40 rounded-xl p-4">
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter a title for this card..."
                className="input-modern min-h-20 resize-none mb-3"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddCard}
                  disabled={!newCardTitle.trim()}
                  className="btn-primary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setShowNewCard(false);
                    setNewCardTitle('');
                  }}
                  className="btn-ghost px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewCard(true)}
              className="w-full border-2 border-dashed border-border/40 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium">Add a card</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}