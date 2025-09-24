'use client';

import { useState } from 'react';
import { Plus, Folder, Archive, Sparkles, TrendingUp, Calendar, Users } from 'lucide-react';
import { useTaskly } from '@/lib/hooks';

interface BoardsPanelProps {
  taskly: ReturnType<typeof useTaskly>;
}

export default function BoardsPanel({ taskly }: BoardsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const handleCreateBoard = () => {
    if (newBoardTitle.trim()) {
      const boardId = taskly.createBoard(newBoardTitle.trim());
      setNewBoardTitle('');
      setIsCreating(false);
      taskly.selectBoard(boardId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateBoard();
    } else if (e.key === 'Escape') {
      setIsCreating(false);
      setNewBoardTitle('');
    }
  };

  const totalCards = taskly.appState.cards.filter(c => !c.isArchived).length;
  const completedCards = taskly.appState.cards.filter(c => c.isArchived).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Enhanced Header with liquid glass gradient */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="absolute inset-0 bg-liquid-glass opacity-20 animate-glass-shimmer" />
        <div className="relative glass-thick border-b border-border/30 px-6 py-8 shadow-glass-lg">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
                  <div className="p-2 bg-gradient-primary rounded-2xl shadow-liquid animate-pulse-glow">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  Taskly
                </h1>
                <p className="text-lg text-muted-foreground">
                  Your beautiful personal kanban workspace
                </p>
              </div>
              
              <div className="hidden md:flex items-center gap-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-center glass-medium p-4 rounded-2xl border border-border/20 shadow-glass liquid-glass-hover">
                  <div className="text-2xl font-bold text-primary">{taskly.activeBoards.length}</div>
                  <div className="text-xs text-muted-foreground">Active Boards</div>
                </div>
                <div className="text-center glass-medium p-4 rounded-2xl border border-border/20 shadow-glass liquid-glass-hover">
                  <div className="text-2xl font-bold text-accent">{totalCards}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center glass-medium p-4 rounded-2xl border border-border/20 shadow-glass liquid-glass-hover">
                  <div className="text-2xl font-bold text-success">{completedCards}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Create Board Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="p-3 bg-gradient-primary rounded-2xl shadow-liquid animate-liquid-float">
              <Folder className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Your Boards</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Existing Boards with enhanced liquid glass */}
            {taskly.activeBoards.map((board, index) => {
              const boardColumns = taskly.getBoardColumns(board.id);
              const boardCards = taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived);
              
              return (
                <button
                  key={board.id}
                  onClick={() => taskly.selectBoard(board.id)}
                  className="group p-6 glass-medium border border-border/30 rounded-3xl hover:glass-thick hover:border-primary/30 hover:shadow-liquid-hover card-hover text-left relative overflow-hidden animate-scale-in liquid-glass-hover"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Enhanced background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-liquid-glass opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-200 mb-2">
                          {board.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1 glass-thin px-2 py-1 rounded-lg">
                            <Archive className="w-3 h-3" />
                            {boardColumns.length} columns
                          </span>
                          <span className="flex items-center gap-1 glass-thin px-2 py-1 rounded-lg">
                            <Calendar className="w-3 h-3" />
                            {boardCards.length} cards
                          </span>
                        </div>
                      </div>
                      <div className="p-3 glass-medium rounded-2xl group-hover:glass-primary transition-all duration-200 shadow-glass">
                        <Folder className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                      </div>
                    </div>
                    
                    {/* Enhanced progress indicator */}
                    {boardCards.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/20">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span className="glass-thin px-2 py-0.5 rounded">
                            {Math.round((completedCards / (totalCards + completedCards)) * 100) || 0}%
                          </span>
                        </div>
                        <div className="h-2 glass-thin rounded-full overflow-hidden border border-border/20">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500 shadow-inner"
                            style={{ width: `${Math.round((completedCards / (totalCards + completedCards)) * 100) || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Liquid glass shimmer on hover */}
                  <div className="absolute inset-0 bg-glass-shimmer opacity-0 group-hover:opacity-30 transition-opacity duration-500 rounded-3xl animate-glass-shimmer" />
                </button>
              );
            })}

            {/* Enhanced Create New Board */}
            {isCreating ? (
              <div className="p-6 glass-thick border-2 border-dashed border-primary/50 rounded-3xl animate-scale-in shadow-liquid">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={() => {
                    if (!newBoardTitle.trim()) {
                      setIsCreating(false);
                    }
                  }}
                  placeholder="Enter board title..."
                  className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder-muted-foreground text-foreground mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateBoard}
                    className="btn-primary text-sm"
                  >
                    Create Board
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewBoardTitle('');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="group p-6 glass-medium border-2 border-dashed border-muted hover:border-primary/50 hover:glass-thick rounded-3xl transition-all duration-300 animate-scale-in liquid-glass-hover animate-liquid-float"
                style={{ animationDelay: `${taskly.activeBoards.length * 0.1}s` }}
              >
                <div className="flex flex-col items-center justify-center text-center h-full">
                  <div className="p-4 bg-gradient-primary rounded-3xl mb-4 group-hover:scale-110 transition-transform duration-200 shadow-liquid animate-pulse-glow">
                    <Plus className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                    Create New Board
                  </span>
                  <span className="text-sm text-muted-foreground mt-1">
                    Start organizing your tasks
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Stats Section */}
        {taskly.activeBoards.length > 0 && (
          <div className="glass-thick border border-border/20 rounded-3xl p-8 animate-fade-in shadow-glass-lg" style={{ animationDelay: '0.5s' }}>
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-3">
              <div className="p-3 bg-gradient-to-r from-accent to-success rounded-2xl shadow-liquid">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              Productivity Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center group">
                <div className="p-4 glass-primary rounded-3xl mb-3 group-hover:glass-thick transition-all duration-300 border border-primary/20 shadow-glass liquid-glass-hover animate-liquid-float">
                  <div className="text-3xl font-bold text-primary mb-1">
                    {taskly.activeBoards.length}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Folder className="w-4 h-4" />
                    Active Boards
                  </div>
                </div>
              </div>
              
              <div className="text-center group">
                <div className="p-4 glass-accent rounded-3xl mb-3 group-hover:glass-thick transition-all duration-300 border border-accent/20 shadow-glass liquid-glass-hover animate-liquid-float" style={{ animationDelay: '0.1s' }}>
                  <div className="text-3xl font-bold text-accent mb-1">
                    {taskly.appState.columns.length}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Archive className="w-4 h-4" />
                    Total Columns
                  </div>
                </div>
              </div>
              
              <div className="text-center group">
                <div className="p-4 glass-success rounded-3xl mb-3 group-hover:glass-thick transition-all duration-300 border border-success/20 shadow-glass liquid-glass-hover animate-liquid-float" style={{ animationDelay: '0.2s' }}>
                  <div className="text-3xl font-bold text-success mb-1">
                    {totalCards}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Active Tasks
                  </div>
                </div>
              </div>
              
              <div className="text-center group">
                <div className="p-4 bg-gradient-to-br from-warning/20 to-warning/10 rounded-3xl mb-3 group-hover:from-warning/30 group-hover:to-warning/20 transition-all duration-300 border border-warning/20 shadow-glass liquid-glass-hover animate-liquid-float" style={{ animationDelay: '0.3s' }}>
                  <div className="text-3xl font-bold text-warning mb-1">
                    {completedCards}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="w-4 h-4" />
                    Completed
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}