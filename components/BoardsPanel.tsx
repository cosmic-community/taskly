'use client';

import { useEffect, useState } from 'react';
import { Plus, Grid3X3, Star, Archive, Settings, User, LogOut, Search, Clock, Users } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateBoard = async () => {
    if (newBoardTitle.trim()) {
      taskly.setCurrentView('boards');
      taskly.setSelectedBoardId(null);
      await taskly.createBoard({ title: newBoardTitle.trim() });
      setNewBoardTitle('');
      setShowNewBoard(false);
    }
  };

  const handleSelectBoard = (boardId: string) => {
    taskly.setSelectedBoardId(boardId);
    taskly.setCurrentView('board');
  };

  useEffect(() => {
    if (taskly.user) {
      taskly.loadBoards();
    }
  }, [taskly.user]);

  const filteredBoards = taskly.boards && taskly.boards.length > 0 
    ? taskly.boards.filter((board: Board) => 
        !board.isArchived && board.title.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const recentBoards = filteredBoards.slice(0, 4);

  const getBoardStats = (boardId: string) => {
    const columns = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(boardId) : [];
    const columnCount = columns.length;
    const cardCount = taskly.cards ? taskly.cards.filter((card) => card.boardId === boardId).length : 0;
    return { columns: columnCount, cards: cardCount };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card/30 border-b border-border/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">Taskly</h1>
                  <p className="text-sm text-muted-foreground">Welcome back, {taskly.user?.metadata.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-modern pl-10 w-64"
                />
              </div>

              <button
                onClick={() => taskly.logout()}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-light rounded-xl p-6 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Grid3X3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Boards</p>
                <p className="text-2xl font-bold text-foreground">{taskly.boards ? taskly.boards.filter(b => !b.isArchived).length : 0}</p>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-xl p-6 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <Clock className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Cards</p>
                <p className="text-2xl font-bold text-foreground">
                  {taskly.cards ? taskly.cards.filter((card) => !card.isArchived).length : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-xl p-6 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collaborators</p>
                <p className="text-2xl font-bold text-foreground">1</p>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-xl p-6 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/20 rounded-lg">
                <Star className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Starred</p>
                <p className="text-2xl font-bold text-foreground">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Boards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Recent Boards</h2>
            <button
              onClick={() => setShowNewBoard(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Board</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* New Board Card */}
            {showNewBoard ? (
              <div className="glass-light border border-border/20 rounded-xl p-6 animate-scale-in">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Enter board title"
                  className="input-modern mb-4"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBoard();
                    } else if (e.key === 'Escape') {
                      setShowNewBoard(false);
                      setNewBoardTitle('');
                    }
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateBoard}
                    className="btn-primary text-sm flex-1"
                    disabled={!newBoardTitle.trim()}
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewBoard(false);
                      setNewBoardTitle('');
                    }}
                    className="btn-ghost text-sm px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowNewBoard(true)}
                className="h-40 bg-card/30 hover:bg-card/50 border-2 border-dashed border-border/30 hover:border-border/50 rounded-xl flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground transition-all group"
              >
                <div className="p-3 bg-primary/10 group-hover:bg-primary/20 rounded-xl transition-colors">
                  <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-medium">Create New Board</span>
                <span className="text-sm">Get started with a new project</span>
              </button>
            )}

            {/* Existing Boards */}
            {filteredBoards.map((board: Board) => {
              const stats = getBoardStats(board.id);
              return (
                <button
                  key={board.id}
                  onClick={() => handleSelectBoard(board.id)}
                  className="glass-light border border-border/20 rounded-xl p-6 hover:shadow-card hover:scale-105 transition-all duration-200 text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-primary rounded-lg group-hover:scale-110 transition-transform">
                        <Grid3X3 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <button className="p-1 text-muted-foreground hover:text-warning transition-colors">
                      <Star className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {board.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{stats.cards} cards</span>
                    <span>{stats.columns} columns</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Empty State */}
          {filteredBoards.length === 0 && !showNewBoard && taskly.boards && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                <Grid3X3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No boards found</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first board to get started'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowNewBoard(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Board
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}