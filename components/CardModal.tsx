'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Tag, User, Clock, Archive, Trash2, Edit3 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import type { Card, Column as ColumnType } from '@/types';

export default function CardModal() {
  const taskly = useTaskly();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const card = taskly.selectedCardId ? taskly.getCardById(taskly.selectedCardId) : null;
  
  // Find the column and board for context
  const column = card ? taskly.getColumnsByBoardId(card.boardId).find((c: ColumnType) => c.id === card.columnId) : null;
  const board = card ? taskly.getBoardById(card.boardId) : null;

  useEffect(() => {
    if (card) {
      setEditTitle(card.title);
      setEditDescription(card.description || '');
    }
  }, [card]);

  if (!card) {
    return null;
  }

  const handleClose = () => {
    taskly.setSelectedCardId(null);
    taskly.setCurrentView('board');
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editTitle.trim()) {
      taskly.updateCard(card.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      taskly.deleteCard(card.id);
      handleClose();
    }
  };

  const handleArchive = () => {
    taskly.updateCard(card.id, { isArchived: !card.isArchived });
  };

  const availableColumns = board ? taskly.getColumnsByBoardId(board.id) : [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-16">
      <div className="bg-card border border-border/20 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="input-modern flex-1 text-lg font-semibold"
                placeholder="Card title..."
                autoFocus
              />
            ) : (
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground truncate">{card.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  in "{column?.title}" • {board?.title}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="btn-primary px-3 py-2 text-sm">
                  Save
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="btn-ghost px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-ghost p-2"
                  aria-label="Edit card"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleArchive}
                  className="btn-ghost p-2"
                  aria-label={card.isArchived ? 'Unarchive card' : 'Archive card'}
                >
                  <Archive className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-ghost p-2 text-destructive hover:bg-destructive/10"
                  aria-label="Delete card"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="btn-ghost p-2"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Edit3 className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Description</h3>
            </div>
            
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="input-modern min-h-32 resize-none"
                placeholder="Add a description for this card..."
                rows={4}
              />
            ) : (
              <div className="bg-secondary/20 border border-border/20 rounded-xl p-4 min-h-32">
                {card.description ? (
                  <p className="text-foreground whitespace-pre-wrap">{card.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">No description added yet.</p>
                )}
              </div>
            )}
          </div>

          {/* Move Card */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Move Card</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {availableColumns.map((col: ColumnType) => (
                <button
                  key={col.id}
                  onClick={() => {
                    if (col.id !== card.columnId) {
                      taskly.updateCard(card.id, { columnId: col.id });
                    }
                  }}
                  disabled={col.id === card.columnId}
                  className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                    col.id === card.columnId
                      ? 'border-primary bg-primary/10 text-primary cursor-default'
                      : 'border-border/20 bg-secondary/20 text-foreground hover:border-primary/50 hover:bg-primary/5'
                  }`}
                >
                  <div className="font-medium">{col.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {taskly.getCardsByColumnId(col.id).length} cards
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Labels</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {card.labels.map((label: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-accent/20 text-accent border border-accent/20 rounded-lg text-sm font-medium"
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
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Due Date</h3>
              </div>
              
              <div className="p-3 bg-secondary/20 border border-border/20 rounded-xl">
                <p className="text-foreground">{card.dueDate}</p>
              </div>
            </div>
          )}

          {/* Card Info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Card Information</h3>
            </div>
            
            <div className="bg-secondary/20 border border-border/20 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Card ID:</span>
                <span className="text-foreground font-mono">{card.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className={`font-medium ${card.isArchived ? 'text-muted-foreground' : 'text-success'}`}>
                  {card.isArchived ? 'Archived' : 'Active'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position:</span>
                <span className="text-foreground">{card.order + 1}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}