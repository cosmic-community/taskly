'use client';

import { useState } from 'react';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Card } from '@/types';
import { useTaskly } from '@/lib/hooks';
import CardComponent from '@/components/Card';

interface ColumnProps {
  column: Column;
  taskly: ReturnType<typeof useTaskly>;
}

export default function ColumnComponent({ column, taskly }: ColumnProps) {
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(column.title);

  const cards = taskly.getColumnCards(column.id);
  const cardIds = cards.map(card => card.id);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableNodeRef,
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

  const { setNodeRef: setDroppableNodeRef } = useDroppable({
    id: `column-cards-${column.id}`,
    data: {
      type: 'column-cards',
      columnId: column.id,
    },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCreateCard = () => {
    if (newCardTitle.trim()) {
      taskly.createCard(column.boardId, column.id, {
        title: newCardTitle.trim(),
      });
      setNewCardTitle('');
      setIsCreatingCard(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateCard();
    } else if (e.key === 'Escape') {
      setIsCreatingCard(false);
      setNewCardTitle('');
    }
  };

  const handleTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle.trim() !== column.title) {
      taskly.updateColumn(column.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditedTitle(column.title);
      setIsEditingTitle(false);
    }
  };

  const handleDeleteColumn = () => {
    if (cards.length > 0) {
      if (window.confirm(`Delete "${column.title}" and all ${cards.length} cards in it?`)) {
        taskly.deleteColumn(column.id);
      }
    } else {
      taskly.deleteColumn(column.id);
    }
  };

  return (
    <div
      ref={setSortableNodeRef}
      style={style}
      className="flex-shrink-0 w-80"
    >
      <div className="bg-white rounded-lg border shadow-sm">
        {/* Column Header */}
        <div
          {...attributes}
          {...listeners}
          className="p-4 border-b cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center justify-between">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={handleTitleSubmit}
                className="text-sm font-semibold bg-transparent border-none outline-none flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h3 className="text-sm font-semibold text-foreground flex-1">
                {column.title}
              </h3>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                {cards.length}
              </span>
              
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowColumnMenu(!showColumnMenu);
                  }}
                  className="p-1 hover:bg-secondary rounded"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showColumnMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowColumnMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-20">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingTitle(true);
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-secondary rounded-t-lg flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Rename
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteColumn();
                          setShowColumnMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-b-lg flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cards Area */}
        <div 
          ref={setDroppableNodeRef}
          className="p-3 min-h-[200px] space-y-2"
        >
          <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
            {cards.map((card) => (
              <CardComponent 
                key={card.id} 
                card={card} 
                onClick={() => taskly.selectCard(card.id)}
              />
            ))}
          </SortableContext>

          {/* Add Card */}
          {isCreatingCard ? (
            <div className="p-3 bg-secondary rounded-lg border-2 border-dashed border-primary">
              <textarea
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={() => {
                  if (!newCardTitle.trim()) {
                    setIsCreatingCard(false);
                  }
                }}
                placeholder="Enter card title..."
                className="w-full text-sm bg-transparent border-none outline-none placeholder-muted-foreground resize-none"
                rows={2}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleCreateCard}
                  className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-90 transition-opacity"
                >
                  Add Card
                </button>
                <button
                  onClick={() => {
                    setIsCreatingCard(false);
                    setNewCardTitle('');
                  }}
                  className="px-3 py-1 bg-white text-foreground text-xs rounded border hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingCard(true)}
              className="w-full p-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary border border-dashed border-muted hover:border-border rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add a card
            </button>
          )}
        </div>
      </div>
    </div>
  );
}