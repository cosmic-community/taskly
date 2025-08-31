'use client';

import { Calendar, Tag, AlignLeft } from 'lucide-react';
import { useSortable } from '@dnd-kit/core';
import { Card } from '@/types';

interface CardProps {
  card: Card;
  onClick: () => void;
}

export default function CardComponent({ card, onClick }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="bg-white border border-border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all group"
    >
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
          <div className={`flex items-center gap-1 text-xs ${
            isOverdue(card.dueDate) 
              ? 'text-destructive' 
              : 'text-muted-foreground'
          }`}>
            <Calendar className="w-3 h-3" />
            <span>{formatDate(card.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
}