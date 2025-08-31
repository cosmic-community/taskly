'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlignLeft, Trash2, Archive, MoreVertical, Sparkles, Save } from 'lucide-react';
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
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanges = title.trim() !== card.title || 
                      description !== (card.description || '') ||
                      JSON.stringify(labels) !== JSON.stringify(card.labels || []) ||
                      dueDate !== (card.dueDate || '');
    setHasChanges(hasChanges);
  }, [title, description, labels, dueDate, card]);

  // Save changes with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (hasChanges) {
        taskly.updateCard(card.id, {
          title: title.trim() || 'Untitled',
          description: description.trim() || undefined,
          labels: labels.length > 0 ? labels : undefined,
          dueDate: dueDate || undefined,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [title, description, labels, dueDate, card, taskly, hasChanges]);

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="glass border border-border/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="relative p-6 border-b border-border/20 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="absolute inset-0 bg-gradient-hero opacity-10 rounded-t-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <div className="p-1.5 bg-gradient-primary rounded-lg shadow-glow">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span>{board?.title}</span>
                <span className="opacity-50">/</span>
                <span>{column?.title}</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                placeholder="Card title..."
              />
              {hasChanges && (
                <div className="flex items-center gap-2 mt-3 text-xs text-primary">
                  <Save className="w-3 h-3" />
                  <span>Auto-saving changes...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-6">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-3 hover:bg-secondary/50 rounded-xl transition-colors duration-200"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-52 glass border border-border/30 rounded-xl shadow-card z-20 overflow-hidden">
                      <button
                        onClick={() => {
                          handleArchiveCard();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors duration-200 flex items-center gap-3"
                      >
                        <Archive className="w-4 h-4 text-accent" />
                        <span>Archive Card</span>
                      </button>
                      <div className="h-px bg-border/20" />
                      <button
                        onClick={() => {
                          handleDeleteCard();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 flex items-center gap-3"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Card</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-3 hover:bg-secondary/50 rounded-xl transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Description */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
                <AlignLeft className="w-4 h-4 text-primary" />
              </div>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to provide more context..."
              rows={4}
              className="input-modern w-full resize-none"
            />
          </div>

          {/* Labels */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2 bg-gradient-to-br from-accent/20 to-accent/10 rounded-lg">
                <Tag className="w-4 h-4 text-accent" />
              </div>
              Labels
            </label>
            
            {/* Existing Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {labels.map((label, index) => (
                  <span
                    key={index}
                    className="group inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary/20 to-accent/20 text-primary text-sm rounded-xl border border-primary/20 cursor-pointer hover:from-primary/30 hover:to-accent/30 transition-all duration-200"
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
            <div className="flex gap-3">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a label..."
                className="input-modern flex-1"
              />
              <button
                onClick={handleAddLabel}
                className="btn-primary"
              >
                Add Label
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2 bg-gradient-to-br from-success/20 to-success/10 rounded-lg">
                <Calendar className="w-4 h-4 text-success" />
              </div>
              Due Date
            </label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-modern w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}