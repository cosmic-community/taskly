'use client';

import { useState } from 'react';
import { Plus, Folder, Archive, Sparkles, TrendingUp, Calendar, Users, Activity, Layers, Zap } from 'lucide-react';
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
      {/* Enhanced Liquid Glass Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-15" />
        <div className="relative glass-thick border-b border-border/20 px-8 py-12 backdrop-blur-4xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="animate-liquid-in">
                <h1 className="text-5xl font-bold gradient-text mb-4 flex items-center gap-4 font-display">
                  <div className="p-4 bg-gradient-primary rounded-3xl shadow-glow animate-liquid-glow">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  Taskly
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                  Your beautiful personal kanban workspace powered by liquid glass
                </p>
              </div>
              
              <div className="hidden lg:flex items-center gap-8 animate-liquid-in" style={{ animationDelay: '0.2s' }}>
                <div className="text-center glass-thin p-6 rounded-3xl backdrop-blur-sm border border-border/20">
                  <div className="text-3xl font-bold text-primary mb-2 font-display">{taskly.activeBoards.length}</div>
                  <div className="text-sm text-muted-foreground">Active Boards</div>
                </div>
                <div className="text-center glass-thin p-6 rounded-3xl backdrop-blur-sm border border-border/20">
                  <div className="text-3xl font-bold text-accent mb-2 font-display">{totalCards}</div>
                  <div className="text-sm text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center glass-thin p-6 rounded-3xl backdrop-blur-sm border border-border/20">
                  <div className="text-3xl font-bold text-success mb-2 font-display">{completedCards}</div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Main Content */}
      <main className="max-w-7xl mx-auto p-8">
        {/* Enhanced Board Grid Section */}
        <div className="mb-16">
          <div className="flex items-center gap-4 mb-8 animate-liquid-in" style={{ animationDelay: '0.3s' }}>
            <div className="p-3 bg-gradient-primary rounded-3xl shadow-glow">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold font-display">Your Boards</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {/* Enhanced Existing Boards */}
            {taskly.activeBoards.map((board, index) => {
              const boardColumns = taskly.getBoardColumns(board.id);
              const boardCards = taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived);
              const completedBoardCards = taskly.appState.cards.filter(c => c.boardId === board.id && c.isArchived);
              const progressPercentage = boardCards.length + completedBoardCards.length > 0 
                ? Math.round((completedBoardCards.length / (boardCards.length + completedBoardCards.length)) * 100)
                : 0;
              
              return (
                <button
                  key={board.id}
                  onClick={() => taskly.selectBoard(board.id)}
                  className="group card-liquid-elevated p-8 text-left relative overflow-hidden animate-liquid-in hover-lift"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Enhanced background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/3 opacity-0 group-hover:opacity-100 transition-all duration-500 rounded-3xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-foreground group-hover:text-primary transition-all duration-300 mb-3 font-display line-clamp-2">
                          {board.title}
                        </h3>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <div className="p-1 bg-primary/20 rounded-lg">
                              <Archive className="w-3 h-3 text-primary" />
                            </div>
                            {boardColumns.length} columns
                          </span>
                          <span className="flex items-center gap-2">
                            <div className="p-1 bg-accent/20 rounded-lg">
                              <Activity className="w-3 h-3 text-accent" />
                            </div>
                            {boardCards.length} cards
                          </span>
                        </div>
                      </div>
                      <div className="p-4 glass-thin rounded-2xl group-hover:bg-primary/15 transition-all duration-300 border border-border/20">
                        <Folder className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                      </div>
                    </div>
                    
                    {/* Enhanced Progress Section */}
                    {(boardCards.length > 0 || completedBoardCards.length > 0) && (
                      <div className="mt-6 pt-6 border-t border-border/20">
                        <div className="flex justify-between text-sm text-muted-foreground mb-3">
                          <span className="font-medium">Progress</span>
                          <span className="font-bold text-primary">{progressPercentage}%</span>
                        </div>
                        <div className="h-2 bg-surface/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700 shadow-glow"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>{completedBoardCards.length} completed</span>
                          <span>{boardCards.length} active</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced hover indicator */}
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="p-2 bg-gradient-primary rounded-2xl shadow-glow">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Enhanced Create New Board */}
            {isCreating ? (
              <div className="card-liquid-elevated p-8 animate-liquid-scale border-2 border-dashed border-primary/30 bg-gradient-card">
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
                  className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder-muted-foreground text-foreground mb-6 font-display"
                  autoFocus
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleCreateBoard}
                    className="btn-primary text-sm flex-1"
                  >
                    Create Board
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setNewBoardTitle('');
                    }}
                    className="btn-secondary text-sm flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="group card-liquid-elevated p-8 bg-surface/30 border-2 border-dashed border-muted/30 hover:border-primary/40 hover:bg-surface/50 transition-all duration-500 animate-liquid-scale hover:scale-105"
                style={{ animationDelay: `${taskly.activeBoards.length * 0.1}s` }}
              >
                <div className="flex flex-col items-center justify-center text-center h-full">
                  <div className="p-5 bg-gradient-primary rounded-3xl mb-6 group-hover:scale-110 transition-all duration-300 shadow-glow">
                    <Plus className="w-10 h-10 text-white" />
                  </div>
                  <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300 font-display mb-2">
                    Create New Board
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Start organizing your tasks with liquid glass elegance
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Enhanced Stats Section */}
        {taskly.activeBoards.length > 0 && (
          <div className="glass-thick border border-border/20 rounded-4xl p-10 animate-liquid-in backdrop-blur-4xl" style={{ animationDelay: '0.5s' }}>
            <h3 className="font-bold text-2xl text-foreground mb-8 flex items-center gap-4 font-display">
              <div className="p-3 bg-gradient-to-r from-accent to-success rounded-3xl shadow-glow-accent">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              Productivity Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center group hover-lift">
                <div className="glass-thin p-6 rounded-3xl mb-4 group-hover:bg-primary/10 transition-all duration-500 border border-border/10">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-4 group-hover:scale-110 transition-all duration-300">
                    <Folder className="w-8 h-8 text-primary mx-auto" />
                  </div>
                  <div className="text-4xl font-bold text-primary mb-2 font-display">
                    {taskly.activeBoards.length}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Active Boards</div>
                </div>
              </div>
              
              <div className="text-center group hover-lift">
                <div className="glass-thin p-6 rounded-3xl mb-4 group-hover:bg-accent/10 transition-all duration-500 border border-border/10">
                  <div className="p-3 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl mb-4 group-hover:scale-110 transition-all duration-300">
                    <Archive className="w-8 h-8 text-accent mx-auto" />
                  </div>
                  <div className="text-4xl font-bold text-accent mb-2 font-display">
                    {taskly.appState.columns.length}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Total Columns</div>
                </div>
              </div>
              
              <div className="text-center group hover-lift">
                <div className="glass-thin p-6 rounded-3xl mb-4 group-hover:bg-success/10 transition-all duration-500 border border-border/10">
                  <div className="p-3 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl mb-4 group-hover:scale-110 transition-all duration-300">
                    <Calendar className="w-8 h-8 text-success mx-auto" />
                  </div>
                  <div className="text-4xl font-bold text-success mb-2 font-display">
                    {totalCards}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Active Tasks</div>
                </div>
              </div>
              
              <div className="text-center group hover-lift">
                <div className="glass-thin p-6 rounded-3xl mb-4 group-hover:bg-warning/10 transition-all duration-500 border border-border/10">
                  <div className="p-3 bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl mb-4 group-hover:scale-110 transition-all duration-300">
                    <Users className="w-8 h-8 text-warning mx-auto" />
                  </div>
                  <div className="text-4xl font-bold text-warning mb-2 font-display">
                    {completedCards}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">Completed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}