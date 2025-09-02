'use client';

import { useState } from 'react';
import { Plus, Archive, Trash2, Sparkles, FolderKanban, Loader2 } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { CreateBoardForm } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateBoardForm>({ title: '' });

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const board = await taskly.createBoard(formData);
      setFormData({ title: '' });
      setShowCreateForm(false);
      taskly.setView('board', board.id);
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleLogout = () => {
    taskly.logout();
    taskly.setView('auth');
  };

  const visibleBoards = taskly.boards.filter(board => !board.isArchived);
  const archivedBoards = taskly.boards.filter(board => board.isArchived);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/20 glass-light">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">Taskly</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {taskly.user?.metadata.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-ghost text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Active Boards Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Your Boards</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Board
            </button>
          </div>

          {/* Create Board Form */}
          {showCreateForm && (
            <div className="glass-light border border-border/20 rounded-xl p-6 mb-6 animate-scale-in">
              <form onSubmit={handleCreateBoard} className="flex gap-3">
                <input
                  type="text"
                  placeholder="Board title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ title: e.target.value })}
                  className="input-modern flex-1"
                  autoFocus
                  disabled={taskly.isLoading}
                />
                <button
                  type="submit"
                  disabled={!formData.title.trim() || taskly.isLoading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {taskly.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ title: '' });
                  }}
                  className="btn-ghost"
                  disabled={taskly.isLoading}
                >
                  Cancel
                </button>
              </form>
            </div>
          )}

          {/* Boards Grid */}
          {visibleBoards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleBoards.map((board) => (
                <div
                  key={board.id}
                  onClick={() => taskly.setView('board', board.id)}
                  className="group glass-light border border-border/20 rounded-xl p-6 hover:shadow-card transition-all duration-300 cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-secondary rounded-lg group-hover:scale-110 transition-transform duration-300">
                      <FolderKanban className="w-6 h-6 text-white" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          taskly.updateBoard(board.id, { isArchived: true });
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                        title="Archive board"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-2 group-hover:gradient-text transition-colors duration-300">
                    {board.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{taskly.getColumnsByBoardId(board.id).length} lists</span>
                    <span>{taskly.cards.filter(card => card.boardId === board.id && !card.isArchived).length} cards</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="p-4 bg-secondary/20 rounded-2xl w-fit mx-auto mb-4">
                <FolderKanban className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-4">Create your first board to get started with Taskly</p>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Board
                </button>
              )}
            </div>
          )}
        </div>

        {/* Archived Boards Section */}
        {archivedBoards.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Archive className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-medium text-muted-foreground">Archived Boards</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {archivedBoards.map((board) => (
                <div
                  key={board.id}
                  className="group glass-dark border border-border/10 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-secondary/30 rounded-lg">
                      <FolderKanban className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
                      <button
                        onClick={() => taskly.updateBoard(board.id, { isArchived: false })}
                        className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                        title="Restore board"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => taskly.deleteBoard(board.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors duration-200"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-muted-foreground mb-2">
                    {board.title}
                  </h3>
                  <div className="flex items-center justify-between text-sm text-muted-foreground/70">
                    <span>{taskly.getColumnsByBoardId(board.id).length} lists</span>
                    <span>{taskly.cards.filter(card => card.boardId === board.id).length} cards</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}