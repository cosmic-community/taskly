'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Plus, MoreVertical, Settings, Trash2, Sparkles, Filter, X, Tag, Layers, Activity } from 'lucide-react';
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
      {/* Enhanced Liquid Glass Header */}
      <header className="glass-thick border-b border-border/10 relative overflow-hidden backdrop-blur-4xl">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="relative px-8 py-6 z-10">
          <div className="flex items-center justify-between max-w-none">
            <div className="flex items-center gap-8">
              <button
                onClick={() => taskly.selectBoard(null)}
                className="btn-ghost flex items-center gap-3 hover:bg-surface/30 rounded-2xl px-4 py-3"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">Back to Boards</span>
              </button>
              
              <div className="h-10 w-px bg-border/30" />
              
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-primary rounded-2xl shadow-glow animate-liquid-glow">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleBoardTitleKeyPress}
                    onBlur={handleBoardTitleSubmit}
                    className="text-3xl font-bold bg-transparent border-none outline-none min-w-[200px] text-foreground font-display"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-3xl font-bold text-foreground hover:text-primary transition-all duration-300 font-display"
                  >
                    {board.title}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Enhanced Stats */}
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-3 glass-thin rounded-2xl border border-border/20 backdrop-blur-sm">
                  <div className="p-2 bg-primary/20 rounded-xl">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">{columns.length}</div>
                    <div className="text-xs text-muted-foreground">Columns</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 glass-thin rounded-2xl border border-border/20 backdrop-blur-sm">
                  <div className="p-2 bg-accent/20 rounded-xl">
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-accent">
                      {selectedLabels.length > 0 ? `${filteredCardsCount}` : filteredCardsCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedLabels.length > 0 ? 'Filtered' : 'Cards'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Label Filter */}
              {allLabels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowLabelFilter(!showLabelFilter)}
                    className={`p-4 rounded-2xl transition-all duration-300 border flex items-center gap-3 backdrop-blur-sm ${
                      selectedLabels.length > 0
                        ? 'bg-primary/15 border-primary/30 text-primary shadow-glow'
                        : 'hover:bg-surface/30 border-border/20 hover:border-border/40'
                    }`}
                  >
                    <Filter className="w-5 h-5" />
                    {selectedLabels.length > 0 && (
                      <span className="text-sm font-bold bg-primary/30 px-2.5 py-1 rounded-xl">
                        {selectedLabels.length}
                      </span>
                    )}
                  </button>

                  {showLabelFilter && (
                    <>
                      <div
                        className="fixed inset-0 z-[9998] backdrop-liquid"
                        onClick={() => setShowLabelFilter(false)}
                      />
                      <div className="absolute top-full right-0 mt-4 w-96 glass-thick border border-border/20 rounded-3xl shadow-glass z-[9999] overflow-hidden backdrop-blur-4xl">
                        <div className="p-6 border-b border-border/10 bg-gradient-surface">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg flex items-center gap-3 font-display">
                              <div className="p-2 bg-primary/20 rounded-2xl">
                                <Tag className="w-5 h-5 text-primary" />
                              </div>
                              Filter by Labels
                            </h4>
                            {selectedLabels.length > 0 && (
                              <button
                                onClick={clearAllFilters}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface/30"
                              >
                                <X className="w-4 h-4" />
                                Clear all
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Select labels to filter cards. Only cards with selected labels will be shown.
                          </p>
                        </div>
                        
                        <div className="max-h-80 overflow-y-auto p-6">
                          <div className="space-y-3">
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
                                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 backdrop-blur-sm ${
                                    isSelected
                                      ? 'bg-primary/15 border-primary/30 text-primary shadow-glow'
                                      : 'hover:bg-surface/30 border-border/20 hover:border-border/40'
                                  }`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={`w-4 h-4 rounded-xl border-2 transition-all duration-200 ${
                                      isSelected
                                        ? 'bg-primary border-primary shadow-glow'
                                        : 'border-border/40'
                                    }`} />
                                    <span className="text-sm font-medium">{label}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground bg-surface/50 px-3 py-1.5 rounded-xl font-bold">
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

              {/* Enhanced Board Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowBoardMenu(!showBoardMenu)}
                  className="p-4 hover:bg-surface/30 rounded-2xl transition-all duration-300 border border-transparent hover:border-border/30 backdrop-blur-sm"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showBoardMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998] backdrop-liquid"
                      onClick={() => setShowBoardMenu(false)}
                    />
                    <div className="absolute top-full right-0 mt-4 w-64 glass-thick border border-border/20 rounded-3xl shadow-glass z-[9999] overflow-hidden backdrop-blur-4xl">
                      <button
                        onClick={() => {
                          setIsEditingTitle(true);
                          setShowBoardMenu(false);
                        }}
                        className="w-full px-6 py-4 text-left text-sm hover:bg-surface/30 transition-all duration-300 flex items-center gap-4"
                      >
                        <div className="p-2 bg-primary/20 rounded-2xl">
                          <Settings className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium">Rename Board</span>
                      </button>
                      <div className="h-px bg-border/10 mx-4" />
                      <button
                        onClick={() => {
                          handleDeleteBoard();
                          setShowBoardMenu(false);
                        }}
                        className="w-full px-6 py-4 text-left text-sm text-destructive hover:bg-destructive/10 transition-all duration-300 flex items-center gap-4"
                      >
                        <div className="p-2 bg-destructive/20 rounded-2xl">
                          <Trash2 className="w-4 h-4" />
                        </div>
                        <span className="font-medium">Delete Board</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Columns Area */}
      <div 
        ref={setNodeRef}
        className="p-8 overflow-x-auto min-h-[calc(100vh-140px)] relative z-10"
      >
        <div className="flex gap-8 min-w-max pb-8">
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            {columns.map((column, index) => (
              <div key={column.id} className="animate-liquid-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <ColumnComponent 
                  column={column} 
                  taskly={taskly}
                  labelFilter={selectedLabels}
                />
              </div>
            ))}
          </SortableContext>

          {/* Enhanced Add Column */}
          <div className="flex-shrink-0 w-80 animate-liquid-in" style={{ animationDelay: `${columns.length * 0.1}s` }}>
            {isCreatingColumn ? (
              <div className="glass-thick border border-primary/20 rounded-3xl p-8 shadow-glow backdrop-blur-4xl">
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
                  className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder-muted-foreground text-foreground mb-6 font-display"
                  autoFocus
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleCreateColumn}
                    className="btn-primary text-sm flex-1"
                  >
                    Add Column
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingColumn(false);
                      setNewColumnTitle('');
                    }}
                    className="btn-secondary text-sm flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreatingColumn(true)}
                className="group w-full h-40 glass-thin border-2 border-dashed border-muted/30 hover:border-primary/40 hover:bg-surface/20 rounded-3xl transition-all duration-500 flex items-center justify-center hover:scale-[1.02] backdrop-blur-sm"
              >
                <div className="text-center">
                  <div className="p-4 bg-gradient-primary rounded-3xl mb-4 group-hover:scale-110 transition-all duration-300 inline-block shadow-glow">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-lg font-bold text-foreground group-hover:text-primary transition-colors duration-300 block font-display">
                    Add Column
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
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