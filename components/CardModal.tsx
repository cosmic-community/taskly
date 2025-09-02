'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, Archive, Trash2, Move, Loader2 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Card, EditCardForm } from '@/types';

interface CardModalProps {
  cardId: string;
  onClose: () => void;
}

export default function CardModal({ cardId, onClose }: CardModalProps) {
  const taskly = useTaskly();
  const card = taskly.getCardById(cardId);
  const [formData, setFormData] = useState<EditCardForm>({
    title: '',
    description: '',
    labels: [],
    dueDate: '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const columns = card ? taskly.getColumnsByBoardId(card.boardId) : [];
  const board = card ? taskly.getBoardById(card.boardId) : undefined;

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description || '',
        labels: card.labels || [],
        dueDate: card.dueDate || '',
        columnId: card.columnId,
      });
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !formData.title.trim()) return;

    try {
      await taskly.updateCard(card.id, formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleMoveToColumn = async (columnId: string) => {
    if (!card) return;
    
    try {
      await taskly.updateCard(card.id, { columnId });
    } catch (error) {
      console.error('Failed to move card:', error);
    }
  };

  const handleArchive = async () => {
    if (!card) return;
    
    try {
      await taskly.updateCard(card.id, { isArchived: !card.isArchived });
    } catch (error) {
      console.error('Failed to archive card:', error);
    }
  };

  const handleDelete = async () => {
    if (!card || !confirm('Are you sure you want to delete this card?')) return;
    
    try {
      await taskly.deleteCard(card.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  };

  const handleAddLabel = (label: string) => {
    if (!formData.labels?.includes(label)) {
      setFormData(prev => ({
        ...prev,
        labels: [...(prev.labels || []), label],
      }));
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels?.filter(label => label !== labelToRemove) || [],
    }));
  };

  if (!card) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-muted-foreground">Card not found</div>
      </div>
    );
  }

  const currentColumn = columns.find(col => col.id === card.columnId);
  const otherColumns = columns.filter(col => col.id !== card.columnId);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-light border border-border/20 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto shadow-card animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? 'Edit Card' : card.title}
              </h2>
              {!isEditing && board && currentColumn && (
                <p className="text-sm text-muted-foreground">
                  in {currentColumn.title} • {board.title}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-ghost text-sm"
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-modern w-full"
                  required
                  disabled={taskly.isLoading}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-modern w-full h-24 resize-none"
                  placeholder="Add a description..."
                  disabled={taskly.isLoading}
                />
              </div>

              {/* Labels */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Labels
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.labels?.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-accent/20 text-accent text-sm rounded-full"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(label)}
                        className="text-accent/60 hover:text-accent"
                        disabled={taskly.isLoading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {['Bug', 'Feature', 'Enhancement', 'Documentation'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddLabel(preset)}
                      className={`px-3 py-1 text-sm rounded-full border transition-colors duration-200 ${
                        formData.labels?.includes(preset)
                          ? 'bg-accent/20 text-accent border-accent/20'
                          : 'border-border/20 text-muted-foreground hover:text-foreground hover:border-border/40'
                      }`}
                      disabled={taskly.isLoading}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="input-modern"
                  disabled={taskly.isLoading}
                />
              </div>

              {/* Move to Column */}
              {otherColumns.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Move to Column
                  </label>
                  <select
                    value={formData.columnId || card.columnId}
                    onChange={(e) => setFormData(prev => ({ ...prev, columnId: e.target.value }))}
                    className="input-modern"
                    disabled={taskly.isLoading}
                  >
                    {columns.map((column) => (
                      <option key={column.id} value={column.id}>
                        {column.title} {column.id === card.columnId ? '(current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/20">
                <button
                  type="submit"
                  disabled={!formData.title.trim() || taskly.isLoading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskly.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Tag className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="btn-ghost"
                  disabled={taskly.isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {/* Description */}
              {card.description && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-secondary/10 rounded-lg p-4">
                    {card.description}
                  </div>
                </div>
              )}

              {/* Labels */}
              {card.labels && card.labels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Labels</h3>
                  <div className="flex flex-wrap gap-2">
                    {card.labels.map((label) => (
                      <span
                        key={label}
                        className="px-3 py-1 bg-accent/20 text-accent text-sm rounded-full"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Due Date */}
              {card.dueDate && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Due Date</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(card.dueDate).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border/20">
                {otherColumns.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Move className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground mr-2">Move to:</span>
                    {otherColumns.map((column) => (
                      <button
                        key={column.id}
                        onClick={() => handleMoveToColumn(column.id)}
                        className="btn-ghost text-sm"
                        disabled={taskly.isLoading}
                      >
                        {column.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleArchive}
                  className="btn-ghost flex items-center gap-2"
                  disabled={taskly.isLoading}
                >
                  <Archive className="w-4 h-4" />
                  {card.isArchived ? 'Restore' : 'Archive'}
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-ghost text-destructive hover:text-destructive/80 flex items-center gap-2"
                  disabled={taskly.isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card Stats */}
        <div className="px-6 py-4 bg-secondary/5 border-t border-border/20 rounded-b-2xl">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Cards in {currentColumn?.title}: {taskly.getCardsByColumnId(card.columnId).length}
            </span>
            <span>
              {card.isArchived ? 'Archived' : 'Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}