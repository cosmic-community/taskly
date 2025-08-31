'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, MoreVertical, Settings, Trash2, Sparkles, Filter, X, Tag } from 'lucide-react';
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
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showLabelFilter, setShowLabelFilter] = useState(false);

  const columns = taskly.getBoardColumns(board.id);
  const columnIds = columns.map(col => col.id);

  // Get all unique labels from cards in this board
  const allLabels = useMemo(() => {
    const boardCards = taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived);
    const labelSet = new Set<string>();
    
    boardCards.forEach(card => {
      if (card.labels) {
        card.labels.forEach(label => labelSet.add(label));
      }
    });
    
    return Array.from(labelSet).sort();
  }, [taskly.appState.cards, board.id]);

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

  const toggleLabelFilter = (label: string) => {
    setSelectedLabels(prev => 
      prev.includes(label) 
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  const clearAllFilters = () => {
    setSelectedLabels([]);
  };

  const filteredCardsCount = useMemo(() => {
    if (selectedLabels.length === 0) {
      return taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived).length;
    }
    
    return taskly.appState.cards.filter(c => 
      c.boardId === board.id && 
      !c.isArchived && 
      c.labels && 
      selectedLabels.some(selectedLabel => c.labels!.includes(selectedLabel))
    ).length;
  }, [taskly.appState.cards, board.id, selectedLabels]);

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="glass border-b border-border/20 px-6 py-4 relative overflow-visible z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
        <div className="relative flex items-center justify-between max-w-none">
          <div className="flex items-center gap-6">
            <button
              onClick={() => taskly.selectBoard(null)}
              className="btn-ghost flex items-center gap-2 hover:bg-secondary/50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Boards</span>
            </button>
            
            <div className="h-8 w-px bg-border/50" />
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              
              {isEditingTitle ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={handleBoardTitleKeyPress}
                  onBlur={handleBoardTitleSubmit}
                  className="text-2xl font-bold bg-transparent border-none outline-none min-w-[200px] text-foreground"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="text-2xl font-bold text-foreground hover:text-primary transition-colors duration-200"
                >
                  {board.title}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/30">
                <span className="text-sm text-muted-foreground">Columns:</span>
                <span className="text-sm font-semibold text-primary">{columns.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border/30">
                <span className="text-sm text-muted-foreground">Cards:</span>
                <span className="text-sm font-semibold text-accent">
                  {selectedLabels.length > 0 ? `${filteredCardsCount} filtered` : filteredCardsCount}
                </span>
              </div>
            </div>

            {/* Label Filter */}
            {allLabels.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowLabelFilter(!showLabelFilter)}
                  className={`p-3 rounded-xl transition-all duration-200 border flex items-center gap-2 ${
                    selectedLabels.length > 0
                      ? 'bg-primary/20 border-primary/30 text-primary'
                      : 'hover:bg-secondary/50 border-transparent hover:border-border/30'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {selectedLabels.length > 0 && (
                    <span className="text-xs font-semibold bg-primary/30 px-1.5 py-0.5 rounded">
                      {selectedLabels.length}
                    </span>
                  )}
                </button>

                {showLabelFilter && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowLabelFilter(false)}
                    />
                    <div className="absolute top-full right-0 mt-2 w-80 glass border border-border/30 rounded-xl shadow-card z-[9999] overflow-hidden">
                      <div className="p-4 border-b border-border/20">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-sm flex items-center gap-2">
                            <Tag className="w-4 h-4 text-primary" />
                            Filter by Labels
                          </h4>
                          {selectedLabels.length > 0 && (
                            <button
                              onClick={clearAllFilters}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              Clear all
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Select labels to filter cards. Only cards with selected labels will be shown.
                        </p>
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto p-4">
                        <div className="space-y-2">
                          {allLabels.map((label) => {
                            const isSelected = selectedLabels.includes(label);
                            const cardCount = taskly.appState.cards.filter(c => 
                              c.boardId === board.id && 
                              !c.isArchived && 
                              c.labels && 
                              c.labels.includes(label)
                            ).length;

                            return (
                              <button
                                key={label}
                                onClick={() => toggleLabelFilter(label)}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                                  isSelected
                                    ? 'bg-primary/20 border-primary/30 text-primary'
                                    : 'hover:bg-secondary/50 border-border/20 hover:border-border/40'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded border-2 transition-all duration-200 ${
                                    isSelected
                                      ? 'bg-primary border-primary'
                                      : 'border-border/40'
                                  }`} />
                                  <span className="text-sm font-medium">{label}</span>
                                </div>
                                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                  {cardCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowBoardMenu(!showBoardMenu)}
                className="p-3 hover:bg-secondary/50 rounded-xl transition-colors duration-200 border border-transparent hover:border-border/30"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showBoardMenu && (
                <>
                  <div
                    className="fixed inset-0 z-[9998]"
                    onClick={() => setShowBoardMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-56 glass border border-border/30 rounded-xl shadow-card z-[9999] overflow-hidden">
                    <button
                      onClick={() => {
                        setIsEditingTitle(true);
                        setShowBoardMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-secondary/50 transition-colors duration-200 flex items-center gap-3"
                    >
                      <Settings className="w-4 h-4 text-primary" />
                      <span>Rename Board</span>
                    </button>
                    <div className="h-px bg-border/20" />
                    <button
                      onClick={() => {
                        handleDeleteBoard();
                        setShowBoardMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors duration-200 flex items-center gap-3"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Board</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Columns */}
      <div 
        ref={setNodeRef}
        className="p-6 overflow-x-auto min-h-[calc(100vh-120px)] relative z-10"
      >
        <div className="flex gap-6 min-w-max pb-6">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column, index) => (
              <div key={column.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <ColumnComponent 
                  column={column} 
                  taskly={taskly}
                  labelFilter={selectedLabels}
                />
              </div>
            ))}
          </SortableContext>

          {/* Add Column */}
          <div className="flex-shrink-0 w-80 animate-fade-in" style={{ animationDelay: `${columns.length * 0.1}s` }}>
            {isCreatingColumn ? (
              <div className="glass-light border border-primary/30 rounded-2xl p-6 shadow-glow">
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
                  className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder-muted-foreground text-foreground mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateColumn}
                    className="btn-primary text-sm"
                  >
                    Add Column
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingColumn(true)}
                className="group w-full h-32 glass-light border-2 border-dashed border-muted hover:border-primary/50 hover:bg-secondary/30 rounded-2xl transition-all duration-300 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="p-3 bg-gradient-primary rounded-xl mb-3 group-hover:scale-110 transition-transform duration-200 inline-block shadow-glow">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-200 block">
                    Add Column
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Create a new workflow stage
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}