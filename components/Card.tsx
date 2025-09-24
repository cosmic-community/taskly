'use client';

import { Calendar, Tag, AlignLeft, Clock, Flame, Sparkles } from 'lucide-react';
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
    opacity: isDragging ? 0.6 : 1,
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
      className="group card-liquid p-5 cursor-pointer hover:border-primary/20 relative overflow-hidden transition-all duration-500"
    >
      {/* Liquid glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/2 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl" />
      
      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-3xl shadow-inner opacity-50" />
      
      <div className="relative z-10">
        {/* Card Title with enhanced styling */}
        <h4 className="text-sm font-semibold text-foreground mb-4 leading-snug group-hover:text-primary transition-all duration-300 line-clamp-2">
          {card.title}
        </h4>

        {/* Description with refined presentation */}
        {card.description && (
          <div className="mb-4 p-3 glass-thin rounded-2xl border border-border/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-gradient-primary rounded-lg">
                <AlignLeft className="w-2.5 h-2.5 text-white" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">Description</span>
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
              {card.description}
            </p>
          </div>
        )}

        {/* Card Details with enhanced spacing */}
        <div className="space-y-3">
          {/* Labels with refined styling */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {card.labels.map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-primary/15 to-accent/10 text-primary text-xs rounded-full border border-primary/20 font-medium backdrop-blur-sm shadow-glass-subtle"
                >
                  <div className="w-1.5 h-1.5 bg-primary rounded-full opacity-80" />
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Due Date with enhanced visual hierarchy */}
          {card.dueDate && (
            <div className={`flex items-center gap-3 text-xs font-medium px-3 py-2 rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
              isOverdue(card.dueDate) 
                ? 'text-destructive bg-destructive/10 border-destructive/20 shadow-glow-accent' 
                : isUpcoming(card.dueDate)
                ? 'text-warning bg-warning/10 border-warning/20'
                : 'text-success bg-success/10 border-success/20'
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
              
              <div className="flex-1">
                <div className="font-semibold">{formatDate(card.dueDate)}</div>
                {isOverdue(card.dueDate) && (
                  <div className="text-xs opacity-80 font-normal">Overdue</div>
                )}
                {isUpcoming(card.dueDate) && !isOverdue(card.dueDate) && (
                  <div className="flex items-center gap-1 text-xs opacity-80">
                    <Clock className="w-2.5 h-2.5" />
                    <span>Due soon</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Click target overlay */}
        <div 
          className="absolute inset-0 cursor-pointer z-20 rounded-3xl" 
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        />
        
        {/* Enhanced hover indicator */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="p-1.5 bg-gradient-primary rounded-xl shadow-glow animate-liquid-glow">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}