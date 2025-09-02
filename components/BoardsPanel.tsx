'use client';

import { useState } from 'react';
import { Plus, Grid3X3, Archive, Search, Settings, LogOut, Sparkles } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredBoards = taskly.boards.filter(board => {
    const matchesSearch = board.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArchive = showArchived ? board.isArchived : !board.isArchived;
    return matchesSearch && matchesArchive;
  });

  const handleCreateBoard = async () => {
    const title = prompt('Enter board name:');
    if (title?.trim()) {
      await taskly.createBoard(title.trim());
    }
  };

  const handleBoardClick = (boardId: string) => {
    taskly.setSelectedBoard(boardId);
    taskly.setView('board');
    taskly.loadBoardData(boardId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/10 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">Your Boards</h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {taskly.user?.metadata.email}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateBoard}
                disabled={taskly.isLoading}
                className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Create Board</span>
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {/* Settings modal */}}
                  className="btn-ghost p-2.5"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                <button
                  onClick={taskly.logout}
                  className="btn-ghost p-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4 mt-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-modern pl-10 w-full"
              />
            </div>
            
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`btn-ghost flex items-center gap-2 px-3 py-2 text-sm font-medium ${
                showArchived ? 'bg-secondary text-foreground' : ''
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="max-w-7xl mx-auto p-6">
        {taskly.isLoading && taskly.boards.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredBoards.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-secondary/20 rounded-2xl w-fit mx-auto mb-4">
                <Grid3X3 className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery 
                  ? 'No boards found' 
                  : showArchived 
                    ? 'No archived boards' 
                    : 'No boards yet'
                }
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? `No boards match "${searchQuery}". Try a different search term.`
                  : showArchived
                    ? 'You don\'t have any archived boards.'
                    : 'Create your first board to get started with organizing your tasks.'
                }
              </p>
              {!searchQuery && !showArchived && (
                <button
                  onClick={handleCreateBoard}
                  disabled={taskly.isLoading}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Your First Board</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBoards.map((board) => (
              <div
                key={board.id}
                onClick={() => handleBoardClick(board.id)}
                className="group cursor-pointer"
              >
                <div className="glass-light border border-border/20 rounded-2xl p-6 hover:border-border/40 transition-all duration-200 hover:shadow-card hover:-translate-y-1 animate-scale-in">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-gradient-primary rounded-lg shadow-sm">
                      <Grid3X3 className="w-5 h-5 text-white" />
                    </div>
                    {board.isArchived && (
                      <div className="px-2 py-1 bg-warning/20 text-warning text-xs font-medium rounded-md border border-warning/20">
                        Archived
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
                    {board.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{taskly.columns.filter(c => c.boardId === board.id).length} columns</span>
                    <span>{taskly.cards.filter(c => c.boardId === board.id).length} cards</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}