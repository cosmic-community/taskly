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
      {/* Modern Header with Gradient */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="relative glass border-b border-border/30 px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-4xl font-bold gradient-text mb-2 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-primary animate-pulse-glow" />
                  Taskly
                </h1>
                <p className="text-lg text-muted-foreground">
                  Your beautiful personal kanban workspace
                </p>
              </div>
              
              <div className="hidden md:flex items-center gap-6 animate-fade-in delay-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{taskly.activeBoards.length}</div>
                  <div className="text-xs text-muted-foreground">Active Boards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{totalCards}</div>
                  <div className="text-xs text-muted-foreground">Total Tasks</div>
                </div>
                <div className="text-center">
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
          <div className="flex items-center gap-3 mb-6 animate-fade-in delay-300">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Your Boards</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Existing Boards */}
            {taskly.activeBoards.map((board, index) => {
              const boardColumns = taskly.getBoardColumns(board.id);
              const boardCards = taskly.appState.cards.filter(c => c.boardId === board.id && !c.isArchived);
              
              return (
                <button
                  key={board.id}
                  onClick={() => taskly.selectBoard(board.id)}
                  className={`group p-6 bg-gradient-card border border-border/30 rounded-2xl hover:border-primary/30 hover:shadow-card-hover card-hover text-left relative overflow-hidden animate-scale-in`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-200 mb-2">
                          {board.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            {boardColumns.length} columns
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {boardCards.length} cards
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-xl group-hover:bg-primary/20 transition-all duration-200">
                        <Folder className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                      </div>
                    </div>
                    
                    {/* Progress indicator */}
                    {boardCards.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/20">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Progress</span>
                          <span>{Math.round((completedCards / (totalCards + completedCards)) * 100) || 0}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((completedCards / (totalCards + completedCards)) * 100) || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Create New Board */}
            {isCreating ? (
              <div className="p-6 bg-gradient-card border-2 border-dashed border-primary/50 rounded-2xl animate-scale-in">
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
                className="group p-6 bg-secondary/30 border-2 border-dashed border-muted hover:border-primary/50 hover:bg-secondary/50 rounded-2xl transition-all duration-300 animate-scale-in"
                style={{ animationDelay: `${taskly.activeBoards.length * 0.1}s` }}
              >
                <div className="flex flex-col items-center justify-center text-center h-full">
                  <div className="p-4 bg-gradient-primary rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-200 shadow-glow">
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
          <div className="glass-light border border-border/20 rounded-2xl p-8 animate-fade-in delay-500">
            <h3 className="font-bold text-xl text-foreground mb-6 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-accent to-success rounded-xl">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              Productivity Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center group">
                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-3 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300">
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
                <div className="p-4 bg-gradient-to-br from-accent/20 to-accent/10 rounded-2xl mb-3 group-hover:from-accent/30 group-hover:to-accent/20 transition-all duration-300">
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
                <div className="p-4 bg-gradient-to-br from-success/20 to-success/10 rounded-2xl mb-3 group-hover:from-success/30 group-hover:to-success/20 transition-all duration-300">
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
                <div className="p-4 bg-gradient-to-br from-warning/20 to-warning/10 rounded-2xl mb-3 group-hover:from-warning/30 group-hover:to-warning/20 transition-all duration-300">
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