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
      className="group glass-medium border border-border/20 rounded-2xl p-4 cursor-pointer hover:glass-thick hover:border-primary/30 hover:shadow-liquid-hover card-hover transition-all duration-300 relative overflow-hidden liquid-glass-hover"
    >
      {/* Enhanced liquid glass gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
      <div className="absolute inset-0 bg-liquid-glass opacity-0 group-hover:opacity-60 transition-opacity duration-300 rounded-2xl" />
      
      <div className="relative">
        <h4 className="text-sm font-semibold text-foreground mb-3 leading-tight group-hover:text-primary transition-colors duration-200">
          {card.title}
        </h4>

        {/* Description - Enhanced with liquid glass styling */}
        {card.description && (
          <div className="mb-3 p-3 glass-thin rounded-xl border border-border/20 group-hover:glass-medium transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <AlignLeft className="w-3 h-3 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Description</span>
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          </div>
        )}

        {/* Card Details */}
        <div className="space-y-3">
          {/* Labels with enhanced liquid glass effect */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 glass-primary rounded-xl border border-primary/20 font-medium text-xs group-hover:glass-thick transition-all duration-300 animate-liquid-float"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-0.5 bg-primary/30 rounded">
                    <Tag className="w-2.5 h-2.5 text-primary" />
                  </div>
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Due Date with enhanced styling */}
          {card.dueDate && (
            <div className={`flex items-center gap-3 text-xs font-medium px-3 py-2 rounded-xl border transition-all duration-300 glass-medium group-hover:glass-thick ${
              isOverdue(card.dueDate) 
                ? 'text-destructive bg-destructive/10 border-destructive/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                : isUpcoming(card.dueDate)
                ? 'text-warning bg-warning/10 border-warning/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                : 'text-success bg-success/10 border-success/20 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
            }`}>
              <div className={`p-1.5 rounded-lg ${
                isOverdue(card.dueDate) 
                  ? 'bg-destructive/20' 
                  : isUpcoming(card.dueDate)
                  ? 'bg-warning/20'
                  : 'bg-success/20'
              }`}>
                {isOverdue(card.dueDate) ? (
                  <Flame className="w-3 h-3" />
                ) : (
                  <Calendar className="w-3 h-3" />
                )}
              </div>
              <span className="flex-1">{formatDate(card.dueDate)}</span>
              {isOverdue(card.dueDate) && (
                <span className="text-xs opacity-80 font-semibold">Overdue</span>
              )}
              {isUpcoming(card.dueDate) && !isOverdue(card.dueDate) && (
                <div className="flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="text-xs opacity-80 font-semibold">Soon</span>
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
        
        {/* Enhanced hover indicator with liquid glass effect */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-primary rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-liquid animate-pulse" />
        
        {/* Subtle liquid glass shimmer on hover */}
        <div className="absolute inset-0 bg-glass-shimmer opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-2xl animate-glass-shimmer" />
      </div>
    </div>
  );
}