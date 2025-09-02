'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Edit3, 
  Calendar, 
  Tag, 
  Archive, 
  Trash2, 
  Save, 
  Clock,
  User,
  MessageSquare,
  Paperclip,
  CheckSquare,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Card, Column } from '@/types';

interface CardModalProps {
  card: Card;
  onClose: () => void;
}

export default function CardModal({ card, onClose }: CardModalProps) {
  const taskly = useTaskly();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    labels: card.labels?.join(', ') || '',
    dueDate: card.dueDate || '',
  });

  // Get the column this card belongs to
  const currentColumn = taskly.appState.columns.find(col => col.id === card.columnId);
  
  // Get all columns for the board (for moving the card)
  const boardColumns = taskly.appState.columns
    .filter(col => col.boardId === card.boardId)
    .sort((a, b) => a.order - b.order);

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    try {
      setIsSaving(true);
      
      const labels = formData.labels
        .split(',')
        .map(label => label.trim())
        .filter(Boolean);

      await taskly.updateCard(card.id, {
        title: formData.title.trim(),
        description: formData.description,
        labels: labels.length > 0 ? labels : undefined,
        dueDate: formData.dueDate || undefined,
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    await taskly.updateCard(card.id, { isArchived: !card.isArchived });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this card? This action cannot be undone.')) {
      await taskly.deleteCard(card.id);
      onClose();
    }
  };

  const handleMoveColumn = async (targetColumnId: string) => {
    if (targetColumnId === card.columnId) return;
    
    const targetColumnCards = taskly.appState.cards.filter(c => c.columnId === targetColumnId && !c.isArchived);
    const newOrder = Math.max(...targetColumnCards.map(c => c.order), 0) + 1;
    
    await taskly.moveCard(card.id, targetColumnId, newOrder);
  };

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && !card.isArchived;
  const isDueSoon = card.dueDate && !isOverdue && 
    new Date(card.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000); // Due within 24 hours

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-card border border-border/20 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Card Details</h2>
              <p className="text-sm text-muted-foreground">
                in {currentColumn?.title}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn-ghost p-2 ${isEditing ? 'bg-primary/10 text-primary' : ''}`}
              title={isEditing ? 'Cancel editing' : 'Edit card'}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className="btn-ghost p-2"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Title
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="input-modern w-full text-lg font-semibold"
                  placeholder="Enter card title..."
                />
              ) : (
                <h3 className="text-lg font-semibold text-foreground bg-secondary/30 rounded-xl p-3">
                  {card.title}
                </h3>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="input-modern w-full min-h-[100px] resize-y"
                  placeholder="Add a description..."
                />
              ) : (
                <div className="bg-secondary/30 rounded-xl p-3 min-h-[60px]">
                  {card.description ? (
                    <p className="text-foreground whitespace-pre-wrap">{card.description}</p>
                  ) : (
                    <p className="text-muted-foreground italic">No description</p>
                  )}
                </div>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Labels
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.labels}
                  onChange={(e) => setFormData(prev => ({ ...prev, labels: e.target.value }))}
                  className="input-modern w-full"
                  placeholder="Enter labels separated by commas..."
                />
              ) : (
                <div className="bg-secondary/30 rounded-xl p-3 min-h-[40px]">
                  {card.labels && card.labels.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {card.labels.map((label, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                        >
                          <Tag className="w-3 h-3" />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No labels</p>
                  )}
                </div>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Due Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="input-modern w-full"
                />
              ) : (
                <div className="bg-secondary/30 rounded-xl p-3">
                  {card.dueDate ? (
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${
                        isOverdue ? 'text-destructive' : 
                        isDueSoon ? 'text-warning' : 
                        'text-primary'
                      }`} />
                      <span className={`font-medium ${
                        isOverdue ? 'text-destructive' : 
                        isDueSoon ? 'text-warning' : 
                        'text-foreground'
                      }`}>
                        {new Date(card.dueDate).toLocaleDateString()}
                      </span>
                      {isOverdue && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">
                          Overdue
                        </span>
                      )}
                      {isDueSoon && !isOverdue && (
                        <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-full">
                          Due soon
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">No due date</p>
                  )}
                </div>
              )}
            </div>

            {/* Move Card */}
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Move to Column
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {boardColumns.map((column) => (
                    <button
                      key={column.id}
                      onClick={() => handleMoveColumn(column.id)}
                      disabled={column.id === card.columnId}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                        column.id === card.columnId
                          ? 'bg-primary/10 border-primary/20 text-primary cursor-default'
                          : 'bg-secondary/30 border-border/20 text-foreground hover:bg-secondary/50 hover:border-border/40'
                      }`}
                    >
                      <span className="font-medium">{column.title}</span>
                      {column.id === card.columnId ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <ArrowRight className="w-4 h-4 opacity-50" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Status */}
            {card.isArchived && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-warning" />
                  <span className="font-medium text-warning">This card is archived</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-border/20 p-6">
          {isEditing ? (
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    title: card.title,
                    description: card.description || '',
                    labels: card.labels?.join(', ') || '',
                    dueDate: card.dueDate || '',
                  });
                }}
                className="btn-ghost"
                disabled={isSaving}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={!formData.title.trim() || isSaving}
                className="btn-primary flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleArchive}
                  className={`btn-ghost flex items-center gap-2 ${
                    card.isArchived ? 'text-success' : 'text-warning'
                  }`}
                >
                  <Archive className="w-4 h-4" />
                  {card.isArchived ? 'Unarchive' : 'Archive'}
                </button>
                
                <button
                  onClick={handleDelete}
                  className="btn-ghost text-destructive flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Card ID: {card.id.slice(-8)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}