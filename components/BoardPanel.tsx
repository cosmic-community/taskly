'use client';

import { useState } from 'react';
import { Plus, ArrowLeft, MoreHorizontal, Archive, Edit3, Trash2 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import Column from './Column';
import type { Board, Column as ColumnType } from '@/types';

export default function BoardPanel() {
  const taskly = useTaskly();
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showNewColumn, setShowNewColumn] = useState(false);

  const board = taskly.selectedBoardId ? taskly.getBoardById(taskly.selectedBoardId) : null;
  const columns = board ? taskly.getColumnsByBoardId(board.id) : [];

  if (!board) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Board not found</p>
        <button
          onClick={() => taskly.setCurrentView('boards')}
          className="btn-ghost mt-4"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      taskly.addColumn(board.id, newColumnTitle.trim());
      setNewColumnTitle('');
      setShowNewColumn(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddColumn();
    } else if (e.key === 'Escape') {
      setShowNewColumn(false);
      setNewColumnTitle('');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Board Header */}
      <div className="border-b border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => taskly.setCurrentView('boards')}
                className="btn-ghost p-2"
                aria-label="Back to boards"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground">{board.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {columns.length} {columns.length === 1 ? 'column' : 'columns'} • {' '}
                  {columns.reduce((total: number, col: ColumnType) => total + taskly.getCardsByColumnId(col.id).length, 0)} {' '}
                  cards
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2" aria-label="Board options">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Columns Container */}
      <div className="flex-1 overflow-x-auto">
        <div className="h-full">
          <div className="flex gap-6 p-6 min-h-full">
            {/* Existing Columns */}
            {columns.map((column: ColumnType) => (
              <Column
                key={column.id}
                column={column}
                cards={taskly.getCardsByColumnId(column.id)}
              />
            ))}

            {/* Add Column */}
            <div className="min-w-80 max-w-80">
              {showNewColumn ? (
                <div className="glass-light border border-border/20 rounded-xl p-4">
                  <input
                    type="text"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter column title..."
                    className="input-modern mb-3"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddColumn}
                      disabled={!newColumnTitle.trim()}
                      className="btn-primary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Column
                    </button>
                    <button
                      onClick={() => {
                        setShowNewColumn(false);
                        setNewColumnTitle('');
                      }}
                      className="btn-ghost px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewColumn(true)}
                  className="w-full glass-light border border-border/20 rounded-xl p-6 flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200 group"
                >
                  <Plus className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  <span className="font-medium">Add a column</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}