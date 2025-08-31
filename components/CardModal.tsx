'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlignLeft, Trash2, Archive, MoreVertical } from 'lucide-react';
import { Card } from '@/types';
import { useTaskly } from '@/lib/hooks';

interface CardModalProps {
  taskly: ReturnType<typeof useTaskly>;
  card: Card;
  onClose: () => void;
}

export default function CardModal({ taskly, card, onClose }: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [labels, setLabels] = useState<string[]>(card.labels || []);
  const [dueDate, setDueDate] = useState(card.dueDate || '');
  const [newLabel, setNewLabel] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  // Save changes whenever form data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title.trim() !== card.title || 
          description !== (card.description || '') ||
          JSON.stringify(labels) !== JSON.stringify(card.labels || []) ||
          dueDate !== (card.dueDate || '')) {
        
        taskly.updateCard(card.id, {
          title: title.trim() || 'Untitled',
          description: description.trim() || undefined,
          labels: labels.length > 0 ? labels : undefined,
          dueDate: dueDate || undefined,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, description, labels, dueDate, card, taskly]);

  const handleAddLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLabel();
    }
  };

  const handleArchiveCard = () => {
    taskly.updateCard(card.id, { isArchived: true });
    onClose();
  };

  const handleDeleteCard = () => {
    if (window.confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      taskly.deleteCard(card.id);
      onClose();
    }
  };

  const column = taskly.appState.columns.find(c => c.id === card.columnId);
  const board = taskly.appState.boards.find(b => b.id === card.boardId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground mb-2">
              {board?.title} / {column?.title}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold w-full bg-transparent border-none outline-none"
              placeholder="Card title..."
            />
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        handleArchiveCard();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-secondary rounded-t-lg flex items-center gap-2"
                    >
                      <Archive className="w-4 h-4" />
                      Archive Card
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteCard();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-b-lg flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Card
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <AlignLeft className="w-4 h-4" />
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              rows={4}
              className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Tag className="w-4 h-4" />
              Labels
            </label>
            
            {/* Existing Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {labels.map((label, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full group cursor-pointer"
                    onClick={() => handleRemoveLabel(label)}
                  >
                    <Tag className="w-3 h-3" />
                    {label}
                    <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                ))}
              </div>
            )}

            {/* Add New Label */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a label..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              <button
                onClick={handleAddLabel}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
              <Calendar className="w-4 h-4" />
              Due Date
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>
        </div>
      </div>
    </div>
  );
}