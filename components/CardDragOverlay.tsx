'use client';

import { Card } from '@/types';
import { Calendar, Tag, AlignLeft, Sparkles } from 'lucide-react';

interface CardDragOverlayProps {
  card: Card;
}

export default function CardDragOverlay({ card }: CardDragOverlayProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="glass border-2 border-primary/50 rounded-xl p-4 cursor-grabbing shadow-2xl transform rotate-3 w-80 animate-pulse-glow">
      <div className="relative">
        {/* Dragging indicator */}
        <div className="absolute -top-2 -right-2 p-1 bg-gradient-primary rounded-full shadow-glow">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
        
        <h4 className="text-sm font-semibold text-foreground mb-3 leading-tight">
          {card.title}
        </h4>

        {/* Card Details */}
        <div className="space-y-2.5">
          {/* Description indicator */}
          {card.description && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="p-1 bg-secondary/50 rounded-md">
                <AlignLeft className="w-3 h-3" />
              </div>
              <span className="text-xs font-medium">Has description</span>
            </div>
          )}

          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-primary/30 to-accent/30 text-primary text-xs rounded-full border border-primary/30 font-medium"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Due Date */}
          {card.dueDate && (
            <div className="flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 bg-success/20 text-success rounded-lg border border-success/30">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(card.dueDate)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}