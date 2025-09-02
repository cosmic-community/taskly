'use client';

import { useState } from 'react';
import { Plus, Grid3X3, Star, Archive, MoreHorizontal, Search } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import type { Board } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const boards = taskly.boards.filter((board: Board) => !board.isArchived);
  const filteredBoards = boards.filter((board: Board) =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBoard = async () => {
    if (newBoardTitle.trim()) {
      await taskly.createBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setShowNewBoard(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setShowNewBoard(false);
      setNewBoardTitle('');
    }
  };

  const handleBoardClick = (board: Board) => {
    taskly.setSelectedBoardId(board.id);
    taskly.setCurrentView('board');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold gradient-text mb-2">My Boards</h1>
            <p className="text-muted-foreground">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'} total
            </p>
          </div>
          
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search boards..."
                className="input-modern pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Create New Board Card */}
        {showNewBoard ? (
          <div className="glass-light border border-border/20 rounded-xl p-6">
            <input
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
                disabled={!newBoardTitle.trim()}
                className="btn-primary px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                Create Board
              </button>
              <button
                onClick={() => {
                  setShowNewBoard(false);
                  setNewBoardTitle('');
                }}
                className="btn-ghost px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewBoard(true)}
            className="glass-light border-2 border-dashed border-border/40 rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group min-h-48"
          >
            <div className="p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-200">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold mb-1">Create new board</p>
              <p className="text-sm opacity-70">Organize your tasks with a new kanban board</p>
            </div>
          </button>
        )}

        {/* Existing Boards */}
        {filteredBoards.map((board: Board, index: number) => {
          const boardColumns = taskly.getColumnsByBoardId(board.id);
          const totalCards = boardColumns.reduce(
            (total: number, col: any) => total + taskly.getCardsByColumnId(col.id).length,
            0
          );

          return (
            <div
              key={board.id}
              onClick={() => handleBoardClick(board)}
              className="glass-light border border-border/20 rounded-xl p-6 cursor-pointer hover:shadow-card hover:scale-[1.02] transition-all duration-200 group min-h-48 flex flex-col"
            >
              {/* Board Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                    <Grid3X3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-200">
                      {board.title}
                    </h3>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle board options
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-secondary/50 rounded-lg transition-all duration-200"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Board Stats */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{boardColumns.length} columns</span>
                  <span>{totalCards} cards</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredBoards.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-secondary/20 rounded-full flex items-center justify-center mb-4">
            <Search className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No boards found</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            No boards match your search query "{searchQuery}". Try adjusting your search terms.
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="btn-ghost mt-4"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Empty State - No Boards */}
      {boards.length === 0 && !searchQuery && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto bg-secondary/20 rounded-full flex items-center justify-center mb-4">
            <Grid3X3 className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to Taskly!</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Get started by creating your first kanban board. Organize your tasks, track progress, and boost productivity.
          </p>
          <button
            onClick={() => setShowNewBoard(true)}
            className="btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create your first board
          </button>
        </div>
      )}
    </div>
  );
}