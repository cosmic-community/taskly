'use client';

import { useEffect } from 'react';
import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';

export default function HomePage() {
  const taskly = useTaskly();

  useEffect(() => {
    if (taskly.checkAuth) {
      taskly.checkAuth();
    }
  }, [taskly]);

  // Show auth panel if user is not authenticated
  if (!taskly.user && taskly.uiState.currentView === 'auth') {
    return <AuthPanel />;
  }

  // Show loading state while checking auth
  if (!taskly.user && !taskly.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Main app views for authenticated users
  return (
    <>
      {/* Navigation Header */}
      <header className="glass-light border-b border-border/20 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => taskly.setView && taskly.setView('boards')}
                className="btn-ghost flex items-center gap-2 px-3 py-2"
              >
                <span className="text-xl">📋</span>
                <span className="font-semibold">Taskly</span>
              </button>
              
              {/* Breadcrumb */}
              {taskly.uiState.currentView === 'board' && taskly.currentBoard && (
                <>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-sm text-muted-foreground">
                    {taskly.currentBoard.title}
                  </span>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {taskly.user && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {taskly.user.metadata?.email || taskly.user.title}
                  </span>
                  <button
                    onClick={taskly.logout}
                    className="btn-ghost px-3 py-1 text-sm"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen bg-background">
        {taskly.uiState.currentView === 'boards' && <BoardsPanel />}
        {taskly.uiState.currentView === 'board' && taskly.getBoardById && taskly.uiState.selectedBoardId && (
          <BoardPanel board={taskly.getBoardById(taskly.uiState.selectedBoardId)} />
        )}
      </main>

      {/* Card Modal */}
      {taskly.uiState.selectedCardId && taskly.selectedCard && (
        <CardModal 
          cardId={taskly.uiState.selectedCardId}
          onClose={() => taskly.selectCard(null)}
        />
      )}
    </>
  );
}