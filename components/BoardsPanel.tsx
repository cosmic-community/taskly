'use client';

import { useState } from 'react';
import { Grid3x3, Plus, Calendar, Archive, Settings, Trash2, Edit } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [editingBoard, setEditingBoard] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoardTitle.trim()) return;

    await taskly.createBoard({ title: newBoardTitle.trim() });
    setNewBoardTitle('');
    setShowCreateForm(false);
  };

  const handleBoardClick = async (board: Board) => {
    taskly.setView('board', board.id);
    await taskly.loadBoardData(board.id);
  };

  const filteredBoards = taskly.boards.filter((board: Board) => !board.isArchived);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getBoardStats = (board: Board) => {
    const boardColumns = taskly.columns.filter((c: any) => c.boardId === board.id);
    const boardCards = taskly.cards.filter((c: any) => c.boardId === board.id && !c.isArchived);
    return { columns: boardColumns.length, cards: boardCards.length };
  };

  if (taskly.isLoading && taskly.boards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back{taskly.user ? `, ${taskly.user.metadata.email.split('@')[0]}` : ''}! 👋
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            {filteredBoards.length === 0 
              ? "Let's create your first board to get started"
              : `You have ${filteredBoards.length} active board${filteredBoards.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          <span>New Board</span>
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-dark border border-border/20 rounded-2xl p-6 w-full max-w-md shadow-card animate-scale-in">
            <h2 className="text-xl font-semibold text-foreground mb-4">Create New Board</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label htmlFor="boardTitle" className="block text-sm font-medium text-foreground mb-2">
                  Board Title
                </label>
                <input
                  id="boardTitle"
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  placeholder="Enter board title..."
                  className="input-modern"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBoardTitle('');
                  }}
                  className="btn-ghost px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardTitle.trim() || taskly.isLoading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Boards Grid */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-16">
          <div className="glass-light rounded-3xl p-12 max-w-md mx-auto border border-border/20">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow">
              <Grid3x3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No boards yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first board to start organizing your tasks and projects.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Board</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoards.map((board: Board, index) => {
            const stats = getBoardStats(board);
            return (
              <div
                key={board.id}
                className="glass-light border border-border/20 rounded-2xl p-6 hover:border-primary/20 transition-all duration-300 cursor-pointer group shadow-card hover:shadow-card-hover animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => handleBoardClick(board)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-glow">
                      <Grid3x3 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      {editingBoard === board.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => setEditingBoard(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingBoard(null);
                            }
                          }}
                          className="input-modern text-lg font-semibold"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {board.title}
                        </h3>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBoard(board.id);
                        setEditTitle(board.title);
                      }}
                      className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{stats.columns}</div>
                    <div className="text-xs text-muted-foreground">Columns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{stats.cards}</div>
                    <div className="text-xs text-muted-foreground">Cards</div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated recently</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <span>Active</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Error Display */}
      {taskly.error && (
        <div className="fixed bottom-4 right-4 bg-destructive text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {taskly.error}
        </div>
      )}
    </div>
  );
}