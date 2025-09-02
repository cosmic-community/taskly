'use client';

import { useState, useRef } from 'react';
import { Plus, Folder, Calendar, User } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import type { Board } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreateBoard = async () => {
    if (!newBoardTitle.trim()) return;

    try {
      taskly.setView('boards');
      taskly.setView('boards');
      await taskly.createBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setShowNewBoard(false);
      taskly.selectBoard(null);
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleViewBoard = (board: Board) => {
    if (!board || !taskly.boards || taskly.boards.length === 0) return;
    if (!taskly.boards || taskly.boards.length === 0) return;

    const boardStats = (boardId: string) => {
      const columns = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(boardId) : [];
      const columnCount = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(boardId).length : 0;
      return { columns: columnCount };
    };

    taskly.selectBoard(board.id);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setShowNewBoard(false);
      setNewBoardTitle('');
    }
  };

  const user = taskly.user;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Boards</h1>
              <p className="text-lg text-muted-foreground mt-2">
                Welcome back, {user && user.metadata ? user.metadata.email : 'User'}! 
                You have {taskly.boards && taskly.boards.length ? taskly.boards.length : 0} {taskly.boards && taskly.boards.length === 1 ? 'board' : 'boards'}
              </p>
            </div>
            
            <button
              onClick={() => setShowNewBoard(true)}
              className="btn-primary flex items-center gap-2 px-6 py-3"
            >
              <Plus className="w-5 h-5" />
              New Board
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create Board Card */}
          {showNewBoard && (
            <div className="glass-light border border-border/20 rounded-xl p-6 animate-scale-in">
              <input
                ref={inputRef}
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Enter board title..."
                className="input-modern mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateBoard}
                  disabled={!newBoardTitle.trim() || taskly.isLoading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowNewBoard(false);
                    setNewBoardTitle('');
                  }}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Board Cards */}
          {taskly.boards && taskly.boards.map((board: Board) => {
            const getBoardStats = (total: number) => {
              const columnCount = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(board.id).length : 0;
              return { columns: columnCount };
            };

            const stats = getBoardStats(0);

            return (
              <div
                key={board.id}
                onClick={() => handleViewBoard(board)}
                className="glass-light border border-border/20 rounded-xl p-6 cursor-pointer hover:bg-secondary/50 transition-all duration-200 group animate-fade-in"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-primary rounded-xl shadow-glow group-hover:scale-110 transition-transform duration-200">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                  {board.title}
                </h3>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    <span>{stats.columns} columns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-accent rounded-full" />
                    <span>
                      {taskly.cards && taskly.cards.filter ? 
                        taskly.cards.filter(card => card.boardId === board.id && !card.isArchived).length 
                        : 0} cards
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Updated recently</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {(!taskly.boards || taskly.boards.length === 0) && !showNewBoard && (
            <div className="col-span-full text-center py-16">
              <div className="p-6 bg-secondary/20 rounded-2xl inline-block mb-6">
                <Folder className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No boards yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Create your first board to start organizing your tasks
              </p>
              <button
                onClick={() => setShowNewBoard(true)}
                className="btn-primary px-6 py-3"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Board
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}