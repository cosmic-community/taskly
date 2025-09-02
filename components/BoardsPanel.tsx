'use client';

import { useState } from 'react';
import { Plus, LayoutGrid, User, LogOut, Loader2 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { CreateBoardForm } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [createBoardForm, setCreateBoardForm] = useState<CreateBoardForm>({
    title: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createBoardForm.title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await taskly.createBoard(createBoardForm);
      setCreateBoardForm({ title: '' });
      setShowCreateBoard(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleBoardClick = async (boardId: string) => {
    taskly.setSelectedBoardId(boardId);
    await taskly.loadBoardData(boardId);
    taskly.setView('board');
  };

  // Get stats for the dashboard
  const totalColumns = taskly.columns.length;
  const totalCards = taskly.cards.length;

  const activeBoards = taskly.boards.filter(board => !board.isArchived);
  const userEmail = taskly.user?.metadata.email || '';

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border/20 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Boards</h1>
              <p className="text-muted-foreground">
                {activeBoards.length} active board{activeBoards.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-lg border border-border/20">
              <div className="p-1.5 bg-primary/10 rounded-full">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground truncate max-w-32">
                {userEmail}
              </span>
            </div>

            {/* Logout Button */}
            <button
              onClick={taskly.logout}
              className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground bg-secondary/30 hover:bg-secondary/50 rounded-lg border border-border/20 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-6 border-b border-border/20">
        <div className="grid grid-cols-3 gap-4">
          <div className="glass-light border border-border/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <LayoutGrid className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Boards</p>
                <p className="text-xl font-semibold text-foreground">{activeBoards.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-light border border-border/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <div className="w-5 h-5 bg-accent rounded border" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Columns</p>
                <p className="text-xl font-semibold text-foreground">{totalColumns}</p>
              </div>
            </div>
          </div>

          <div className="glass-light border border-border/20 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <div className="w-5 h-5 bg-success rounded-sm border" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cards</p>
                <p className="text-xl font-semibold text-foreground">{totalCards}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Boards Grid */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">Recent Boards</h2>
            <button
              onClick={() => setShowCreateBoard(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Board
            </button>
          </div>

          {/* Create Board Form */}
          {showCreateBoard && (
            <div className="mb-6 p-4 glass-light border border-border/20 rounded-xl">
              <form onSubmit={handleCreateBoard} className="space-y-4">
                <div>
                  <label htmlFor="boardTitle" className="block text-sm font-medium text-foreground mb-2">
                    Board Title
                  </label>
                  <input
                    id="boardTitle"
                    type="text"
                    value={createBoardForm.title}
                    onChange={(e) => setCreateBoardForm({ title: e.target.value })}
                    className="input-modern w-full"
                    placeholder="Enter board title..."
                    autoFocus
                    disabled={isCreating}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={!createBoardForm.title.trim() || isCreating}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isCreating ? 'Creating...' : 'Create Board'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateBoard(false);
                      setCreateBoardForm({ title: '' });
                    }}
                    className="btn-secondary"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Boards List */}
          {activeBoards.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-secondary/20 rounded-full w-fit mx-auto mb-4">
                <LayoutGrid className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Get started by creating your first board. Organize your tasks and boost your productivity!
              </p>
              {!showCreateBoard && (
                <button
                  onClick={() => setShowCreateBoard(true)}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Board
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeBoards
                .sort((a, b) => a.order - b.order)
                .map((board, index: number) => (
                  <div
                    key={board.id}
                    className="group glass-light border border-border/20 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-card hover:scale-[1.02] hover:border-primary/20 animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleBoardClick(board.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-gradient-primary rounded-lg shadow-glow group-hover:scale-110 transition-transform duration-300">
                        <LayoutGrid className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate flex-1">
                        {board.title}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Columns</span>
                        <span className="font-medium text-foreground">
                          {taskly.columns.filter(col => col.boardId === board.id).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Cards</span>
                        <span className="font-medium text-foreground">
                          {taskly.cards.filter(card => card.boardId === board.id).length}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/10">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}