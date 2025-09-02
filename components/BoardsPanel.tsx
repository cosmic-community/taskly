'use client';

import { useState, useEffect } from 'react';
import { Plus, Archive, MoreHorizontal, Edit2, Trash2, Copy, Calendar, Users } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';
import { Board, CreateBoardForm } from '@/types';

export default function BoardsPanel() {
  const taskly = useTaskly();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBoardForm>({ title: '' });

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    try {
      await taskly.createBoard(createForm.title.trim());
      setCreateForm({ title: '' });
      setShowCreateForm(false);
      if (taskly.setView) {
        taskly.setView('boards');
      }
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const handleBoardClick = (board: Board) => {
    if (taskly.setView) {
      taskly.setView('board');
    }
    taskly.selectBoard(board.id);
  };

  const activeBoards = taskly.boards ? taskly.boards.filter((board: Board) => !board.isArchived) : [];
  const archivedBoards = taskly.boards ? taskly.boards.filter((board: Board) => board.isArchived) : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            Welcome back{taskly.user ? `, ${taskly.user.title}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your projects with beautiful kanban boards
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Board
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-light rounded-xl p-4 border border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Boards</p>
              <p className="text-xl font-bold">{activeBoards.length}</p>
            </div>
          </div>
        </div>
        
        <div className="glass-light rounded-xl p-4 border border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Columns</p>
              <p className="text-xl font-bold">
                {activeBoards.reduce((total, board: Board) => {
                  const columns = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(board.id) : [];
                  return total + columns.length;
                }, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass-light rounded-xl p-4 border border-border/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Archive className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cards</p>
              <p className="text-xl font-bold">
                {taskly.cards ? taskly.cards.filter((card: any) => !card.isArchived).length : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Boards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📋</span>
          Your Boards
        </h2>
        
        {activeBoards.length === 0 ? (
          <div className="glass-light rounded-xl p-12 border border-border/20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Create your first board</h3>
              <p className="text-muted-foreground mb-6">
                Get started by creating a board to organize your projects and tasks.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                Create Board
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeBoards.map((board: Board) => (
              <BoardCard
                key={board.id}
                board={board}
                onBoardClick={() => handleBoardClick(board)}
                taskly={taskly}
              />
            ))}
          </div>
        )}
      </div>

      {/* Archived Boards */}
      {archivedBoards.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Archive className="w-5 h-5" />
            Archived Boards
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {archivedBoards.map((board: Board) => (
              <BoardCard
                key={board.id}
                board={board}
                onBoardClick={() => handleBoardClick(board)}
                taskly={taskly}
                isArchived
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-light rounded-2xl p-6 w-full max-w-md border border-border/20 animate-scale-in">
            <h3 className="text-xl font-semibold mb-4">Create New Board</h3>
            
            <form onSubmit={handleCreateBoard}>
              <div className="mb-4">
                <label htmlFor="board-title" className="block text-sm font-medium mb-2">
                  Board Title
                </label>
                <input
                  id="board-title"
                  type="text"
                  required
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ title: e.target.value })}
                  className="input-modern w-full"
                  placeholder="Enter board title"
                  autoFocus
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={taskly.isLoading}
                  className="btn-primary flex-1"
                >
                  {taskly.isLoading ? 'Creating...' : 'Create Board'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface BoardCardProps {
  board: Board;
  onBoardClick: () => void;
  taskly: any;
  isArchived?: boolean;
}

function BoardCard({ board, onBoardClick, taskly, isArchived = false }: BoardCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(board.title);

  const handleEditSave = async () => {
    if (editTitle.trim() && editTitle !== board.title) {
      await taskly.updateBoard(board.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleArchiveToggle = () => {
    taskly.updateBoard(board.id, { isArchived: !board.isArchived });
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      taskly.deleteBoard(board.id);
    }
    setShowMenu(false);
  };

  const columnCount = taskly.getColumnsByBoardId ? taskly.getColumnsByBoardId(board.id).length : 0;
  const cardCount = taskly.cards ? taskly.cards.filter((card: any) => 
    card.boardId === board.id && !card.isArchived
  ).length : 0;

  return (
    <div className={`glass-light rounded-xl border border-border/20 p-4 hover:scale-[1.02] transition-all duration-200 cursor-pointer group ${isArchived ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleEditSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEditSave();
              if (e.key === 'Escape') {
                setEditTitle(board.title);
                setIsEditing(false);
              }
            }}
            className="input-modern text-lg font-semibold w-full"
            autoFocus
          />
        ) : (
          <h3 
            className="text-lg font-semibold line-clamp-2 flex-1 mr-2"
            onClick={onBoardClick}
          >
            {board.title}
          </h3>
        )}
        
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-secondary/50 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-popover border border-border/20 rounded-lg shadow-lg z-10 py-1 min-w-[140px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 w-full text-left"
              >
                <Edit2 className="w-3 h-3" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchiveToggle();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary/50 w-full text-left"
              >
                <Archive className="w-3 h-3" />
                {isArchived ? 'Restore' : 'Archive'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive w-full text-left"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div 
        className="flex items-center gap-4 text-sm text-muted-foreground"
        onClick={onBoardClick}
      >
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {columnCount} columns
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {cardCount} cards
        </span>
      </div>
    </div>
  );
}