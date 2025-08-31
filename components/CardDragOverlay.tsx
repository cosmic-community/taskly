'use client';

import { Card } from '@/types';
import { Calendar, Tag, AlignLeft } from 'lucide-react';

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
    <div className="bg-white border-2 border-primary rounded-lg p-3 cursor-grabbing shadow-2xl transform rotate-3 w-80">
      <h4 className="text-sm font-medium text-foreground mb-2 leading-tight">
        {card.title}
      </h4>

      {/* Card Details */}
      <div className="space-y-2">
        {/* Description indicator */}
        {card.description && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <AlignLeft className="w-3 h-3" />
            <span className="text-xs">Description</span>
          </div>
        )}

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((label, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
              >
                <Tag className="w-2.5 h-2.5" />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Due Date */}
        {card.dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(card.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}