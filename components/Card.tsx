'use client';

import { Calendar, Tag, AlignLeft, Clock, Flame } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
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

  const isUpcoming = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays > 0;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group glass-light border border-border/20 rounded-xl p-4 cursor-pointer hover:border-primary/30 hover:shadow-card-hover card-hover transition-all duration-300 relative overflow-hidden"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
      
      <div className="relative">
        <h4 className="text-sm font-semibold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors duration-200">
          {card.title}
        </h4>

        {/* Description - Show actual content instead of just indicator */}
        {card.description && (
          <div className="mb-3 p-2 bg-secondary/30 rounded-lg border border-border/20">
            <div className="flex items-center gap-2 mb-1">
              <AlignLeft className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Description</span>
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          </div>
        )}

        {/* Card Details */}
        <div className="space-y-2.5">
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-primary/20 to-accent/20 text-primary text-xs rounded-full border border-primary/20 font-medium"
                >
                  <Tag className="w-2.5 h-2.5" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Due Date */}
          {card.dueDate && (
            <div className={`flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg border ${
              isOverdue(card.dueDate) 
                ? 'text-destructive bg-destructive/10 border-destructive/20' 
                : isUpcoming(card.dueDate)
                ? 'text-warning bg-warning/10 border-warning/20'
                : 'text-success bg-success/10 border-success/20'
            }`}>
              {isOverdue(card.dueDate) ? (
                <Flame className="w-3 h-3" />
              ) : (
                <Calendar className="w-3 h-3" />
              )}
              <span>{formatDate(card.dueDate)}</span>
              {isOverdue(card.dueDate) && (
                <span className="text-xs opacity-80">Overdue</span>
              )}
              {isUpcoming(card.dueDate) && !isOverdue(card.dueDate) && (
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="text-xs opacity-80">Soon</span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Click target overlay - prevents drag when clicking to open modal */}
        <div 
          className="absolute inset-0 cursor-pointer z-10" 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
        
        {/* Hover indicator */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-glow" />
      </div>
    </div>
  );
}