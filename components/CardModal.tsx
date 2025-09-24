'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlignLeft, Trash2, Archive, MoreVertical, Sparkles, Save, Check } from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState(false);

  // Track changes
  useEffect(() => {
    const hasChanges = title.trim() !== card.title || 
                      description !== (card.description || '') ||
                      JSON.stringify(labels.sort()) !== JSON.stringify((card.labels || []).sort()) ||
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
  }, [title, description, labels, dueDate, card.id, taskly, hasChanges]);

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
      e.preventDefault();
      handleAddLabel();
    }
  };

  const handleSaveAndClose = async () => {
    if (hasChanges) {
      setIsSaving(true);
      try {
        await taskly.updateCard(card.id, {
          title: title.trim() || 'Untitled',
          description: description.trim() || undefined,
          labels: labels.length > 0 ? labels : undefined,
          dueDate: dueDate || undefined,
        });
        // Small delay to show the saving state
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error('Error saving card:', error);
      } finally {
        setIsSaving(false);
      }
    }
    onClose();
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

  // Handle modal close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const column = taskly.appState.columns.find(c => c.id === card.columnId);
  const board = taskly.appState.boards.find(b => b.id === card.boardId);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-3xl flex items-center justify-center p-4 z-[10000] animate-backdrop-blur">
      <div className="glass-thick border border-border/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-glass-xl animate-scale-in">
        {/* Header with enhanced liquid glass */}
        <div className="relative p-6 border-b border-border/20 bg-gradient-to-r from-primary/5 to-accent/5 rounded-t-3xl overflow-hidden">
          <div className="absolute inset-0 glass-primary opacity-30" />
          <div className="absolute inset-0 bg-liquid-glass animate-glass-shimmer" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                <div className="p-2 bg-gradient-primary rounded-xl shadow-liquid">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="glass-thin px-3 py-1 rounded-lg">{board?.title || 'Unknown Board'}</span>
                <span className="opacity-50">/</span>
                <span className="glass-thin px-3 py-1 rounded-lg">{column?.title || 'Unknown Column'}</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                placeholder="Card title..."
              />
              {hasChanges && !isSaving && (
                <div className="flex items-center gap-2 mt-3 text-xs text-primary glass-thin px-3 py-1 rounded-lg inline-flex">
                  <Save className="w-3 h-3 animate-pulse" />
                  <span>Auto-saving changes...</span>
                </div>
              )}
              {isSaving && (
                <div className="flex items-center gap-2 mt-3 text-xs text-success glass-success px-3 py-1 rounded-lg inline-flex">
                  <div className="w-3 h-3 animate-spin rounded-full border-2 border-success border-t-transparent" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-6">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-3 glass-medium hover:glass-thick rounded-xl transition-all duration-200 liquid-glass-hover"
                  aria-label="Card menu"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-52 glass-thick border border-border/30 rounded-2xl shadow-glass-lg z-[9999] overflow-hidden">
                      <button
                        onClick={() => {
                          handleArchiveCard();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm hover:glass-accent transition-all duration-200 flex items-center gap-3 liquid-glass-hover"
                      >
                        <div className="p-1.5 bg-accent/20 rounded-lg">
                          <Archive className="w-4 h-4 text-accent" />
                        </div>
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
                        <div className="p-1.5 bg-destructive/20 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span>Delete Card</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-3 glass-medium hover:glass-thick rounded-xl transition-all duration-200 liquid-glass-hover"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content with enhanced liquid glass sections */}
        <div className="p-6 space-y-8">
          {/* Description */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2.5 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-liquid">
                <AlignLeft className="w-4 h-4 text-primary" />
              </div>
              Description
            </label>
            <div className="glass-medium rounded-2xl border border-border/20 overflow-hidden">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description to provide more context..."
                rows={4}
                className="w-full p-4 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground resize-none focus:bg-glass-thin transition-all duration-300"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2.5 bg-gradient-to-br from-accent/20 to-accent/10 rounded-xl shadow-liquid">
                <Tag className="w-4 h-4 text-accent" />
              </div>
              Labels
            </label>
            
            {/* Existing Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {labels.map((label, index) => (
                  <button
                    key={index}
                    className="group inline-flex items-center gap-2 px-3 py-2 glass-primary rounded-xl border border-primary/20 hover:glass-thick transition-all duration-200 liquid-glass-hover animate-liquid-float"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => handleRemoveLabel(label)}
                    title={`Remove "${label}" label`}
                  >
                    <div className="p-0.5 bg-primary/30 rounded">
                      <Tag className="w-3 h-3 text-primary" />
                    </div>
                    {label}
                    <div className="p-0.5 bg-destructive/30 rounded opacity-60 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3 text-destructive" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Add New Label */}
            <div className="flex gap-3">
              <div className="flex-1 glass-medium rounded-xl border border-border/20 overflow-hidden">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add a label..."
                  className="w-full p-3 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
                />
              </div>
              <button
                onClick={handleAddLabel}
                disabled={!newLabel.trim() || labels.includes(newLabel.trim())}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Label
              </button>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="flex items-center gap-3 text-sm font-semibold text-foreground mb-4">
              <div className="p-2.5 bg-gradient-to-br from-success/20 to-success/10 rounded-xl shadow-liquid">
                <Calendar className="w-4 h-4 text-success" />
              </div>
              Due Date
            </label>
            <div className="flex gap-3">
              <div className="flex-1 glass-medium rounded-xl border border-border/20 overflow-hidden">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-3 bg-transparent border-none outline-none text-foreground"
                />
              </div>
              {dueDate && (
                <button
                  onClick={() => setDueDate('')}
                  className="btn-secondary whitespace-nowrap"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer with enhanced liquid glass styling */}
        <div className="border-t border-border/20 p-6 bg-gradient-to-r from-primary/5 to-accent/5 rounded-b-3xl relative overflow-hidden">
          <div className="absolute inset-0 glass-thin opacity-50" />
          <div className="relative flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? (
                <span className="flex items-center gap-2 text-primary glass-thin px-3 py-1 rounded-lg">
                  <Save className="w-3 h-3" />
                  Unsaved changes
                </span>
              ) : (
                <span className="flex items-center gap-2 text-success glass-success px-3 py-1 rounded-lg">
                  <Check className="w-3 h-3" />
                  All changes saved
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="btn-primary flex items-center gap-2 min-w-[140px] justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save & Close</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}