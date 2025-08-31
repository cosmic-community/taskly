'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, MoreVertical, Settings, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { Board } from '@/types';
import { useTaskly } from '@/lib/hooks';
import ColumnComponent from '@/components/Column';

interface BoardPanelProps {
  taskly: ReturnType<typeof useTaskly>;
  board: Board;
}

export default function BoardPanel({ taskly, board }: BoardPanelProps) {
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(board.title);

  const columns = taskly.getBoardColumns(board.id);
  const columnIds = columns.map(col => col.id);

  const { setNodeRef } = useDroppable({
    id: `board-${board.id}`,
    data: {
      type: 'board',
      boardId: board.id,
    },
  });

  const handleCreateColumn = () => {
    if (newColumnTitle.trim()) {
      taskly.createColumn(board.id, newColumnTitle.trim());
      setNewColumnTitle('');
      setIsCreatingColumn(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateColumn();
    } else if (e.key === 'Escape') {
      setIsCreatingColumn(false);
      setNewColumnTitle('');
    }
  };

  const handleBoardTitleSubmit = () => {
    if (editedTitle.trim() && editedTitle.trim() !== board.title) {
      taskly.updateBoard(board.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleBoardTitleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBoardTitleSubmit();
    } else if (e.key === 'Escape') {
      setEditedTitle(board.title);
      setIsEditingTitle(false);
    }
  };

  const handleDeleteBoard = () => {
    if (window.confirm(`Are you sure you want to delete "${board.title}"? This will delete all columns and cards in this board.`)) {
      taskly.deleteBoard(board.id);
      taskly.selectBoard(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => taskly.selectBoard(null)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Boards</span>
            </button>
            
            <div className="h-6 w-px bg-border" />
            
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleBoardTitleKeyPress}
                onBlur={handleBoardTitleSubmit}
                className="text-lg font-semibold bg-transparent border-none outline-none min-w-[200px]"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
              >
                {board.title}
              </button>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowBoardMenu(!showBoardMenu)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showBoardMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowBoardMenu(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      setIsEditingTitle(true);
                      setShowBoardMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-secondary rounded-t-lg flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Rename Board
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteBoard();
                      setShowBoardMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 rounded-b-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Board
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Columns */}
      <div 
        ref={setNodeRef}
        className="p-6 overflow-x-auto"
      >
        <div className="flex gap-6 min-w-max pb-6">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column) => (
              <ColumnComponent 
                key={column.id} 
                column={column} 
                taskly={taskly}
              />
            ))}
          </SortableContext>

          {/* Add Column */}
          <div className="flex-shrink-0 w-80">
            {isCreatingColumn ? (
              <div className="bg-white rounded-lg border p-4">
                <input
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={() => {
                    if (!newColumnTitle.trim()) {
                      setIsCreatingColumn(false);
                    }
                  }}
                  placeholder="Enter column title..."
                  className="w-full text-sm font-medium bg-transparent border-none outline-none placeholder-muted-foreground"
                  autoFocus
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleCreateColumn}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded hover:opacity-90 transition-opacity"
                  >
                    Add Column
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground text-sm rounded hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingColumn(true)}
                className="w-full h-12 bg-white/60 border-2 border-dashed border-muted hover:border-primary hover:bg-white rounded-lg transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Column</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}