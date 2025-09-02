'use client';

import { useState } from 'react';
import { Plus, MoreVertical, Trash2, Edit3, Archive, Grid3x3, Clock, Users } from 'lucide-react';
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

    await taskly.createBoard(newBoardTitle.trim());
    setNewBoardTitle('');
    setShowCreateForm(false);
  };

  const handleEditBoard = async (board: Board, newTitle: string) => {
    if (!newTitle.trim() || newTitle === board.title) {
      setEditingBoard(null);
      setEditTitle('');
      return;
    }

    await taskly.updateBoard(board.id, { title: newTitle.trim() });
    setEditingBoard(null);
    setEditTitle('');
  };

  const handleArchiveBoard = async (board: Board) => {
    await taskly.updateBoard(board.id, { isArchived: !board.isArchived });
  };

  const handleDeleteBoard = async (board: Board) => {
    if (window.confirm(`Are you sure you want to delete "${board.title}"? This action cannot be undone.`)) {
      await taskly.deleteBoard(board.id);
    }
  };

  const handleBoardClick = (board: Board) => {
    if (editingBoard === board.id) return;
    
    taskly.setSelectedBoardId(board.id);
    taskly.setCurrentView('board');
    taskly.loadBoardData(board.id);
  };

  const activeBoards = taskly.boards.filter(board => !board.isArchived);
  const archivedBoards = taskly.boards.filter(board => board.isArchived);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-6 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text">My Boards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeBoards.length} active board{activeBoards.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center gap-2"
            disabled={taskly.isLoading}
          >
            <Plus className="w-4 h-4" />
            New Board
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Create Board Form */}
        {showCreateForm && (
          <div className="mb-8 p-6 glass-light border border-border/20 rounded-2xl animate-scale-in">
            <h3 className="text-lg font-semibold mb-4">Create New Board</h3>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="Enter board title..."
                className="input-modern"
                autoFocus
                disabled={taskly.isLoading}
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={taskly.isLoading || !newBoardTitle.trim()}
                >
                  Create Board
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewBoardTitle('');
                  }}
                  className="btn-secondary"
                  disabled={taskly.isLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Active Boards */}
        {activeBoards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Grid3x3 className="w-5 h-5" />
              Active Boards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isEditing={editingBoard === board.id}
                  editTitle={editTitle}
                  onEdit={(title) => {
                    setEditingBoard(board.id);
                    setEditTitle(title);
                  }}
                  onSaveEdit={(title) => handleEditBoard(board, title)}
                  onCancelEdit={() => {
                    setEditingBoard(null);
                    setEditTitle('');
                  }}
                  onEditTitleChange={setEditTitle}
                  onArchive={() => handleArchiveBoard(board)}
                  onDelete={() => handleDeleteBoard(board)}
                  onClick={() => handleBoardClick(board)}
                  taskly={taskly}
                />
              ))}
            </div>
          </div>
        )}

        {/* Archived Boards */}
        {archivedBoards.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archived Boards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedBoards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  isEditing={editingBoard === board.id}
                  editTitle={editTitle}
                  onEdit={(title) => {
                    setEditingBoard(board.id);
                    setEditTitle(title);
                  }}
                  onSaveEdit={(title) => handleEditBoard(board, title)}
                  onCancelEdit={() => {
                    setEditingBoard(null);
                    setEditTitle('');
                  }}
                  onEditTitleChange={setEditTitle}
                  onArchive={() => handleArchiveBoard(board)}
                  onDelete={() => handleDeleteBoard(board)}
                  onClick={() => handleBoardClick(board)}
                  taskly={taskly}
                  isArchived
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeBoards.length === 0 && !showCreateForm && (
          <div className="text-center py-12 animate-fade-in">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
                <Grid3x3 className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first board to start organizing your tasks and projects.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Your First Board
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface BoardCardProps {
  board: Board;
  isEditing: boolean;
  editTitle: string;
  onEdit: (title: string) => void;
  onSaveEdit: (title: string) => void;
  onCancelEdit: () => void;
  onEditTitleChange: (title: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onClick: () => void;
  taskly: ReturnType<typeof useTaskly>;
  isArchived?: boolean;
}

function BoardCard({
  board,
  isEditing,
  editTitle,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditTitleChange,
  onArchive,
  onDelete,
  onClick,
  taskly,
  isArchived = false,
}: BoardCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const columns = taskly.getColumnsByBoardId(board.id);
  const totalCards = columns.reduce((sum, column) => {
    return sum + taskly.getCardsByColumnId(column.id).length;
  }, 0);

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveEdit(editTitle);
  };

  return (
    <div
      className={`group relative p-6 glass-light border border-border/20 rounded-2xl transition-all duration-200 cursor-pointer ${
        isArchived 
          ? 'opacity-75 hover:opacity-100' 
          : 'hover:shadow-card hover:border-primary/20'
      }`}
      onClick={isEditing ? undefined : onClick}
    >
      {/* Menu Button */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-secondary/50 rounded-lg transition-colors duration-200"
          disabled={taskly.isLoading}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 w-48 glass-light border border-border/20 rounded-xl shadow-popover z-10 animate-scale-in">
            <div className="p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(board.title);
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary/50 rounded-lg transition-colors duration-200"
              >
                <Edit3 className="w-4 h-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary/50 rounded-lg transition-colors duration-200"
              >
                <Archive className="w-4 h-4" />
                {isArchived ? 'Unarchive' : 'Archive'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="space-y-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="w-full text-lg font-semibold bg-transparent border-b border-border/50 focus:border-primary pb-2 outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="text-xs px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                Save
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
                className="text-xs px-3 py-1 bg-secondary/50 text-foreground rounded-lg hover:bg-secondary transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold mb-1 group-hover:gradient-text transition-all duration-200">
                {board.title}
              </h3>
              {isArchived && (
                <span className="inline-block px-2 py-1 text-xs bg-secondary/50 text-muted-foreground rounded-full">
                  Archived
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{columns.length} columns</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{totalCards} cards</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}