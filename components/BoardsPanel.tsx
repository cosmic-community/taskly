'use client';

import { useState } from 'react';
import { Plus, Folder, Archive } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';

interface BoardsPanelProps {
  taskly: ReturnType<typeof useTaskly>;
}

export default function BoardsPanel({ taskly }: BoardsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const handleCreateBoard = () => {
    if (newBoardTitle.trim()) {
      const boardId = taskly.createBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setIsCreating(false);
      taskly.selectBoard(boardId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewBoardTitle('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Taskly</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personal Kanban Board
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Create Board Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Folder className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold">Your Boards</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Existing Boards */}
            {taskly.activeBoards.map((board) => (
              <button
                key={board.id}
                onClick={() => taskly.selectBoard(board.id)}
                className="p-4 bg-white border-2 border-border rounded-lg hover:border-primary hover:shadow-md transition-all duration-200 text-left group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary">
                      {board.title}
                    </h3>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {taskly.getBoardColumns(board.id).length} columns
                    </div>
                  </div>
                  <Folder className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </button>
            ))}

            {/* Create New Board */}
            {isCreating ? (
              <div className="p-4 bg-white border-2 border-dashed border-primary rounded-lg">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={() => {
                    if (!newBoardTitle.trim()) {
                      setIsCreating(false);
                    }
                  }}
                  placeholder="Enter board title..."
                  className="w-full text-sm bg-transparent border-none outline-none placeholder-muted-foreground"
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleCreateBoard}
                    className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:opacity-90"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewBoardTitle('');
                    }}
                    className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/80"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="p-4 bg-white border-2 border-dashed border-muted hover:border-primary rounded-lg transition-colors group"
              >
                <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary">
                  <Plus className="w-8 h-8 mb-2" />
                  <span className="text-sm font-medium">Create New Board</span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {taskly.activeBoards.length > 0 && (
          <div className="bg-white border rounded-lg p-6">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4" />
              Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {taskly.activeBoards.length}
                </div>
                <div className="text-sm text-muted-foreground">Boards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {taskly.appState.columns.length}
                </div>
                <div className="text-sm text-muted-foreground">Columns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {taskly.appState.cards.filter(c => !c.isArchived).length}
                </div>
                <div className="text-sm text-muted-foreground">Active Cards</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {taskly.appState.cards.filter(c => c.isArchived).length}
                </div>
                <div className="text-sm text-muted-foreground">Archived</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}