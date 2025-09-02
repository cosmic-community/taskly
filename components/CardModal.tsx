'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Tag, 
  Archive, 
  Trash2, 
  Edit3,
  Save,
  FileText,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Card } from '@/types';

export interface CardModalProps {
  cardId: string;
  onClose: () => void;
}

export default function CardModal({ cardId, onClose }: CardModalProps) {
  const taskly = useTaskly();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    dueDate: '',
    labels: [] as string[],
  });
  const [newLabel, setNewLabel] = useState('');

  // Find the card
  const card = taskly.appState.cards.find(c => c.id === cardId);
  const column = card ? taskly.appState.columns.find(col => col.id === card.columnId) : null;

  useEffect(() => {
    if (card) {
      setEditData({
        title: card.title,
        description: card.description || '',
        dueDate: card.dueDate || '',
        labels: card.labels || [],
      });
    }
  }, [card]);

  if (!card || !column) {
    return null;
  }

  const handleSave = async () => {
    try {
      await taskly.updateCard(card.id, {
        title: editData.title,
        description: editData.description,
        dueDate: editData.dueDate || undefined,
        labels: editData.labels.length > 0 ? editData.labels : undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await taskly.updateCard(card.id, { isArchived: !card.isArchived });
    } catch (error) {
      console.error('Failed to archive card:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      try {
        await taskly.deleteCard(card.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete card:', error);
      }
    }
  };

  const handleAddLabel = () => {
    if (newLabel.trim() && !editData.labels.includes(newLabel.trim())) {
      setEditData(prev => ({
        ...prev,
        labels: [...prev.labels, newLabel.trim()]
      }));
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setEditData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-sm text-muted-foreground font-medium">
              {column.title}
            </span>
            {card.isArchived && (
              <div className="px-2 py-1 bg-muted rounded-md text-xs text-muted-foreground">
                Archived
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-ghost p-2"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="btn-ghost p-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Title */}
          <div className="mb-6">
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className="input-modern text-xl font-bold w-full"
                placeholder="Card title..."
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{card.title}</h1>
            )}
          </div>

          {/* Labels */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Labels</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {editData.labels.map((label, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                >
                  <span>{label}</span>
                  {isEditing && (
                    <button
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 text-primary/60 hover:text-primary"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {isEditing && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddLabel()}
                  className="input-modern flex-1 text-sm"
                  placeholder="Add a label..."
                />
                <button
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim()}
                  className="btn-primary px-4 text-sm"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Due Date</h3>
            </div>
            
            {isEditing ? (
              <input
                type="date"
                value={editData.dueDate}
                onChange={(e) => setEditData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="input-modern"
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                {card.dueDate ? formatDate(card.dueDate) : 'No due date set'}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-foreground">Description</h3>
            </div>
            
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                className="input-modern min-h-[120px] resize-y"
                placeholder="Add a description..."
              />
            ) : (
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                {card.description || 'No description'}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-secondary/20">
          <div className="flex gap-2">
            <button
              onClick={handleArchive}
              className={`btn-ghost flex items-center gap-2 text-sm ${
                card.isArchived ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {card.isArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {card.isArchived ? 'Unarchive' : 'Archive'}
            </button>
            <button
              onClick={handleDelete}
              className="btn-ghost flex items-center gap-2 text-sm text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original values
                  setEditData({
                    title: card.title,
                    description: card.description || '',
                    dueDate: card.dueDate || '',
                    labels: card.labels || [],
                  });
                }}
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
          )}
        </div>
      </div>
    </div>
  );
}