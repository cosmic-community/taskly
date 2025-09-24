'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, AlignLeft, Trash2, Archive, MoreVertical, Sparkles, Save, Check, Clock, MapPin } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/70 backdrop-liquid flex items-center justify-center p-6 z-[10000]">
      <div className="glass-thick border border-border/20 rounded-4xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-glass animate-liquid-scale backdrop-blur-4xl">
        {/* Enhanced Header */}
        <div className="relative p-8 border-b border-border/10 bg-gradient-hero/10 rounded-t-4xl">
          <div className="absolute inset-0 bg-gradient-surface opacity-50 rounded-t-4xl" />
          <div className="relative flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <div className="p-2 bg-gradient-primary rounded-2xl shadow-glow">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{board?.title || 'Unknown Board'}</span>
                  <div className="w-1 h-1 bg-muted-foreground rounded-full opacity-50" />
                  <span className="font-medium">{column?.title || 'Unknown Column'}</span>
                </div>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder-muted-foreground font-display"
                placeholder="Card title..."
              />
              {hasChanges && !isSaving && (
                <div className="flex items-center gap-3 mt-4 text-sm text-primary">
                  <div className="p-1.5 bg-primary/20 rounded-xl">
                    <Save className="w-3 h-3 animate-pulse" />
                  </div>
                  <span className="font-medium">Auto-saving changes...</span>
                </div>
              )}
              {isSaving && (
                <div className="flex items-center gap-3 mt-4 text-sm text-success">
                  <div className="p-1.5 bg-success/20 rounded-xl">
                    <div className="w-3 h-3 animate-spin rounded-full border-2 border-success border-t-transparent" />
                  </div>
                  <span className="font-medium">Saving...</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3 ml-8">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-4 hover:bg-surface/30 rounded-2xl transition-all duration-300 backdrop-blur-sm"
                  aria-label="Card menu"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998] backdrop-liquid-strong"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-3 w-56 glass-thick border border-border/20 rounded-3xl shadow-glass z-[9999] overflow-hidden backdrop-blur-4xl">
                      <button
                        onClick={() => {
                          handleArchiveCard();
                          setShowMenu(false);
                        }}
                        className="w-full px-6 py-4 text-left text-sm hover:bg-surface/30 transition-all duration-300 flex items-center gap-4"
                      >
                        <div className="p-2 bg-accent/20 rounded-2xl">
                          <Archive className="w-4 h-4 text-accent" />
                        </div>
                        <span className="font-medium">Archive Card</span>
                      </button>
                      <div className="h-px bg-border/10 mx-4" />
                      <button
                        onClick={() => {
                          handleDeleteCard();
                          setShowMenu(false);
                        }}
                        className="w-full px-6 py-4 text-left text-sm text-destructive hover:bg-destructive/10 transition-all duration-300 flex items-center gap-4"
                      >
                        <div className="p-2 bg-destructive/20 rounded-2xl">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Delete Card</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
              
              <button
                onClick={onClose}
                className="p-4 hover:bg-surface/30 rounded-2xl transition-all duration-300 backdrop-blur-sm"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="p-8 space-y-10">
          {/* Enhanced Description */}
          <div>
            <label className="flex items-center gap-4 text-lg font-bold text-foreground mb-6 font-display">
              <div className="p-3 bg-gradient-to-br from-primary/15 to-primary/5 rounded-2xl border border-primary/20">
                <AlignLeft className="w-5 h-5 text-primary" />
              </div>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description to provide more context..."
              rows={5}
              className="input-liquid w-full resize-none text-base leading-relaxed"
            />
          </div>

          {/* Enhanced Labels */}
          <div>
            <label className="flex items-center gap-4 text-lg font-bold text-foreground mb-6 font-display">
              <div className="p-3 bg-gradient-to-br from-accent/15 to-accent/5 rounded-2xl border border-accent/20">
                <Tag className="w-5 h-5 text-accent" />
              </div>
              Labels
            </label>
            
            {/* Enhanced Existing Labels */}
            {labels.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-6">
                {labels.map((label, index) => (
                  <button
                    key={index}
                    className="group inline-flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/15 to-accent/10 text-primary text-sm rounded-2xl border border-primary/20 hover:from-primary/25 hover:to-accent/20 transition-all duration-300 backdrop-blur-sm shadow-glass-subtle"
                    onClick={() => handleRemoveLabel(label)}
                    title={`Remove "${label}" label`}
                  >
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="font-medium">{label}</span>
                    <X className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}

            {/* Enhanced Add New Label */}
            <div className="flex gap-4">
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Add a label..."
                className="input-liquid flex-1 text-base"
              />
              <button
                onClick={handleAddLabel}
                disabled={!newLabel.trim() || labels.includes(newLabel.trim())}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-8"
              >
                Add Label
              </button>
            </div>
          </div>

          {/* Enhanced Due Date */}
          <div>
            <label className="flex items-center gap-4 text-lg font-bold text-foreground mb-6 font-display">
              <div className="p-3 bg-gradient-to-br from-success/15 to-success/5 rounded-2xl border border-success/20">
                <Calendar className="w-5 h-5 text-success" />
              </div>
              Due Date
            </label>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-liquid w-full text-base"
                />
                {dueDate && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Due {new Date(dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              {dueDate && (
                <button
                  onClick={() => setDueDate('')}
                  className="btn-secondary whitespace-nowrap px-6"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="border-t border-border/10 p-8 bg-gradient-surface/50 rounded-b-4xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {hasChanges ? (
                <span className="flex items-center gap-3 text-primary">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <Save className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Unsaved changes</span>
                </span>
              ) : (
                <span className="flex items-center gap-3 text-success">
                  <div className="p-2 bg-success/20 rounded-xl">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="font-medium">All changes saved</span>
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="btn-secondary px-8 py-3"
              >
                Close
              </button>
              <button
                onClick={handleSaveAndClose}
                disabled={isSaving}
                className="btn-primary flex items-center gap-3 min-w-[160px] justify-center px-8 py-3"
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