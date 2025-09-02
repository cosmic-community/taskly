'use client';

import { useState } from 'react';
import { Plus, Search, Grid, MoreHorizontal, Archive, Star, Clock, Users, Loader2, Sparkles } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [searchTerm, setSearchTerm] = useState('');
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    try {
      setIsCreatingBoard(true);
      const board = await taskly.createBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      // Navigate to the new board
      taskly.setSelectedBoard(board.id);
      taskly.setCurrentView('board');
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsCreatingBoard(false);
    }
  };

  const handleSelectBoard = (board: Board) => {
    taskly.setSelectedBoard(board.id);
    taskly.setCurrentView('board');
  };

  // Filter boards based on search and archived status
  const filteredBoards = taskly.appState.boards.filter(board => {
    const matchesSearch = board.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? board.isArchived : !board.isArchived;
    return matchesSearch && matchesArchived;
  });

  const activeBoards = filteredBoards.filter(board => !board.isArchived);
  const archivedBoards = filteredBoards.filter(board => board.isArchived);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Your Boards</h1>
                <p className="text-muted-foreground">
                  {activeBoards.length} active • {archivedBoards.length} archived
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-modern pl-10 w-64"
                />
              </div>

              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`btn-ghost p-3 ${showArchived ? 'bg-accent text-accent-foreground' : ''}`}
                title={showArchived ? 'Hide archived boards' : 'Show archived boards'}
              >
                <Archive className="w-5 h-5" />
              </button>

              <button
                onClick={() => taskly.logout()}
                className="btn-ghost p-3"
                title="Sign out"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Create Board Form */}
          <form onSubmit={handleCreateBoard} className="glass-light border border-border/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Create New Board</h3>
            </div>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Enter board title..."
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                className="input-modern flex-1"
                disabled={isCreatingBoard}
              />
              
              <button
                type="submit"
                disabled={!newBoardTitle.trim() || isCreatingBoard}
                className="btn-primary px-6 flex items-center gap-2"
              >
                {isCreatingBoard ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        {filteredBoards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="p-6 bg-secondary/20 rounded-3xl mb-4">
              <Grid className="w-12 h-12 text-muted-foreground mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-muted-foreground mb-2">
              {searchTerm ? 'No boards found' : 'No boards yet'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {searchTerm 
                ? `No boards match "${searchTerm}". Try adjusting your search.`
                : 'Create your first board to start organizing your tasks with columns and cards.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={() => {
                  // Fix: Properly type the element and add null check
                  const input = document.querySelector('input[placeholder="Enter board title..."]') as HTMLInputElement | null;
                  input?.focus();
                }}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Board
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => handleSelectBoard(board)}
                className="group glass-card border border-border/20 rounded-2xl p-6 cursor-pointer hover:shadow-card hover:scale-[1.02] transition-all duration-200 animate-fade-in"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-200">
                    <Grid className="w-6 h-6 text-primary" />
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Show board menu
                    }}
                    className="opacity-0 group-hover:opacity-100 btn-ghost p-2 transition-all duration-200"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold text-foreground text-lg mb-2 group-hover:text-primary transition-colors duration-200">
                    {board.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Grid className="w-3 h-3" />
                      <span>
                        {taskly.appState.columns.filter(c => c.boardId === board.id).length} columns
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived).length} cards
                      </span>
                    </div>
                  </div>
                </div>

                {board.isArchived && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
                    <Archive className="w-3 h-3" />
                    <span>Archived</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-border/40 bg-card/30 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-primary" />
              <span>{activeBoards.length} Active Boards</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-success" />
              <span>
                {taskly.appState.cards.filter(c => !c.isArchived).length} Total Cards
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" />
              <span>{taskly.appState.user?.metadata.email}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}