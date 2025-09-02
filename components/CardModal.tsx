'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, User, Clock, Archive, Trash2, Save } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Card, Column } from '@/types';

export default function CardModal() {
  const taskly = useTaskly();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const card = taskly.selectedCard;
  const columns = taskly.appState.columns;
  const column = card ? columns.find((c: Column) => c.id === card.columnId) : null;

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setDueDate(card.dueDate || '');
      setLabels(card.labels || []);
    }
  }, [card]);

  if (!card) return null;

  const handleSave = async () => {
    await taskly.updateCard(card.id, {
      title,
      description,
      dueDate,
      labels,
    });
    handleClose();
  };

  const handleClose = () => {
    taskly.selectCard(null);
  };

  const handleArchive = async () => {
    await taskly.updateCard(card.id, { isArchived: true });
    handleClose();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      await taskly.deleteCard(card.id);
      handleClose();
    }
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()]);
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Edit Card</h2>
            {column && (
              <span className="text-sm text-muted-foreground">
                in {column.title}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-modern"
                placeholder="Enter card title"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="input-modern resize-none"
                placeholder="Add a more detailed description..."
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-modern"
              />
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Tag className="w-4 h-4 inline mr-2" />
                Labels
              </label>
              
              <div className="flex flex-wrap gap-2 mb-3">
                {labels.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                  >
                    {label}
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="text-primary/60 hover:text-primary ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add label"
                  className="input-modern flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddLabel();
                    }
                  }}
                />
                <button
                  onClick={handleAddLabel}
                  className="btn-ghost px-4"
                  disabled={!newLabel.trim()}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border/20 bg-card/50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="btn-ghost text-warning flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="btn-ghost text-destructive flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}