'use client';

import { useState } from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
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

  const handleAddCard = async () => {
    if (newCardTitle.trim()) {
      try {
        await taskly.addCard(column.id, newCardTitle.trim());
        setNewCardTitle('');
        setShowNewCard(false);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddCard();
    } else if (e.key === 'Escape') {
      setShowNewCard(false);
      setNewCardTitle('');
    }
  };

  const handleCardClick = (card: CardType) => {
    if (taskly.setSelectedCardId && taskly.setCurrentView) {
      taskly.setSelectedCardId(card.id);
      taskly.setCurrentView('card');
    }
  };

  const sortedCards = [...cards].sort((a, b) => a.order - b.order);

  return (
    <div className="min-w-80 max-w-80">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">{column.title}</h3>
          <span className="bg-secondary/50 text-muted-foreground px-2 py-1 rounded-md text-sm font-medium">
            {cards.length}
          </span>
        </div>
        <button className="btn-ghost p-1.5" aria-label="Column options">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Cards Container */}
      <div className="space-y-3 mb-4 min-h-2">
        {sortedCards.map((card) => (
          <Card 
            key={card.id} 
            card={card} 
            onClick={() => handleCardClick(card)}
          />
        ))}
      </div>

      {/* Add Card */}
      {showNewCard ? (
        <div className="glass-light border border-border/20 rounded-xl p-4">
          <textarea
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Enter card title..."
            className="input-modern resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddCard}
              disabled={!newCardTitle.trim() || taskly.isLoading}
              className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Card
            </button>
            <button
              onClick={() => {
                setShowNewCard(false);
                setNewCardTitle('');
              }}
              className="btn-ghost px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNewCard(true)}
          className="w-full glass-light border border-border/20 rounded-xl p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
          <span className="text-sm font-medium">Add a card</span>
        </button>
      )}
    </div>
  );
}