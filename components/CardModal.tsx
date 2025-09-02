'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, User, Archive, Trash2, Save, Edit3 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import type { Card, Column, Board } from '@/types';

interface CardModalProps {
  cardId: string;
  onClose: () => void;
}

export default function CardModal({ cardId, onClose }: CardModalProps) {
  const taskly = useTaskly();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    labels: [] as string[],
    dueDate: '',
  });

  // Get card data
  const card = taskly.getCardById ? taskly.getCardById(cardId) : null;
  
  // Get related data
  const columns = card ? (taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(card.boardId) : []) : [];
  const board = card ? (taskly.getBoardById ? taskly.getBoardById(card.boardId) : null) : null;

  useEffect(() => {
    if (card) {
      setFormData({
        title: card.title,
        description: card.description || '',
        labels: card.labels || [],
        dueDate: card.dueDate || '',
      });
    }
  }, [card]);

  if (!card) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border/20 rounded-2xl p-6 max-w-md w-full">
          <p className="text-center text-muted-foreground">Card not found</p>
          <button onClick={onClose} className="btn-primary w-full mt-4">
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      await taskly.updateCard(card.id, {
        title: formData.title,
        description: formData.description,
        labels: formData.labels,
        dueDate: formData.dueDate,
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleCancel = () => {
    setFormData({
      title: card.title,
      description: card.description || '',
      labels: card.labels || [],
      dueDate: card.dueDate || '',
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this card?')) {
      try {
        await taskly.deleteCard(card.id);
        onClose();
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleArchive = async () => {
    try {
      await taskly.updateCard(card.id, { isArchived: !card.isArchived });
    } catch (error) {
      // Error handled by the hook
    }
  };

  const addLabel = (label: string) => {
    if (label.trim() && !formData.labels.includes(label.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, label.trim()]
      }));
    }
  };

  const removeLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label)
    }));
  };

  const currentColumn = columns.find((col: Column) => col.id === card.columnId);

  const predefinedLabels = [
    { name: 'Bug', color: 'bg-red-500' },
    { name: 'Feature', color: 'bg-blue-500' },
    { name: 'Enhancement', color: 'bg-green-500' },
    { name: 'Documentation', color: 'bg-yellow-500' },
    { name: 'Testing', color: 'bg-purple-500' },
    { name: 'High Priority', color: 'bg-orange-500' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border/20 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto">
          <div className="flex items-start justify-between mb-6">
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="input-modern text-2xl font-bold flex-1 mr-4"
                placeholder="Card title..."
              />
            ) : (
              <h1 className="text-3xl font-bold text-foreground flex-1">{card.title}</h1>
            )}
            
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-ghost p-2"
                  title="Edit card"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={!formData.title.trim() || taskly.isLoading}
                    className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="btn-ghost px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              <button
                onClick={onClose}
                className="btn-ghost p-2"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Card Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full" />
              <span>in {currentColumn?.title || 'Unknown Column'}</span>
            </div>
            {board && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-accent rounded-full" />
                <span>on {board.title}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Description</h3>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-modern min-h-32"
                placeholder="Add a description..."
                rows={6}
              />
            ) : (
              <div className="glass-light border border-border/20 rounded-xl p-4">
                {card.description ? (
                  <p className="text-foreground whitespace-pre-wrap">{card.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description provided</p>
                )}
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Labels</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.labels.map((label: string) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 bg-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {label}
                  {isEditing && (
                    <button
                      onClick={() => removeLabel(label)}
                      className="hover:bg-primary/30 rounded-full p-0.5 transition-colors duration-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            
            {isEditing && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {predefinedLabels.map((label) => (
                    <button
                      key={label.name}
                      onClick={() => addLabel(label.name)}
                      disabled={formData.labels.includes(label.name)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-opacity duration-200 ${label.color} ${
                        formData.labels.includes(label.name) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                      }`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {label.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Due Date */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Due Date</h3>
            {isEditing ? (
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="input-modern"
              />
            ) : (
              <div className="glass-light border border-border/20 rounded-xl p-4">
                {card.dueDate ? (
                  <div className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(card.dueDate).toLocaleDateString()}</span>
                  </div>
                ) : (
                  <p className="text-muted-foreground italic flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    No due date set
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-border/20 p-6 bg-secondary/10">
          <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
          
          <div className="space-y-3">
            {/* Move to Column */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Move to Column
              </label>
              <select
                value={card.columnId}
                onChange={(e) => {
                  if (e.target.value !== card.columnId) {
                    taskly.updateCard(card.id, { columnId: e.target.value });
                  }
                }}
                disabled={taskly.isLoading}
                className="input-modern"
              >
                {columns.map((column: Column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Archive/Unarchive */}
            <button
              onClick={handleArchive}
              disabled={taskly.isLoading}
              className="btn-secondary w-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Archive className="w-4 h-4" />
              {card.isArchived ? 'Unarchive' : 'Archive'}
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              disabled={taskly.isLoading}
              className="btn-danger w-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Delete Card
            </button>
          </div>

          {/* Card Info */}
          <div className="mt-8 pt-6 border-t border-border/20">
            <h4 className="text-sm font-medium text-foreground mb-3">Card Information</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Created:</span>
                <span>Recently</span>
              </div>
              <div className="flex justify-between">
                <span>Column:</span>
                <span>{currentColumn?.title || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Board:</span>
                <span>{board?.title || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                  card.isArchived 
                    ? 'bg-orange-500/20 text-orange-400' 
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {card.isArchived ? 'Archived' : 'Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">Activity</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="text-foreground">Card created</p>
                  <p className="text-muted-foreground text-xs">Just now</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}