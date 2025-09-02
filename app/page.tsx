'use client';

import { useEffect } from 'react';
import { useTaskly } from '@/lib/hooks';
import { TasklyProvider } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';

function TasklyApp() {
  const taskly = useTaskly();

  useEffect(() => {
    // Check for existing authentication
    taskly.checkAuth();
  }, [taskly]);

  // Show auth panel if no user is logged in
  if (!taskly.user || taskly.uiState.currentView === 'auth') {
    return <AuthPanel />;
  }

  const renderCurrentView = () => {
    switch (taskly.uiState.currentView) {
      case 'boards':
        return <BoardsPanel />;
      case 'board':
        return <BoardPanel />;
      default:
        return <BoardsPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b border-border/20 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl shadow-glow">
                  <div className="w-6 h-6 bg-white rounded-sm" />
                </div>
                <h1 className="text-xl font-bold gradient-text">Taskly</h1>
              </div>
              
              {/* Breadcrumb */}
              <nav className="hidden sm:flex items-center gap-2 text-sm">
                <button
                  onClick={() => taskly.setView('boards')}
                  className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                    taskly.uiState.currentView === 'boards'
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  My Boards
                </button>
                
                {taskly.uiState.selectedBoardId && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-foreground font-medium">
                      {taskly.getBoardById(taskly.uiState.selectedBoardId)?.title || 'Board'}
                    </span>
                  </>
                )}
              </nav>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Welcome back,</span>
                <span className="font-medium text-foreground">
                  {taskly.user.metadata.email}
                </span>
              </div>
              
              <button
                onClick={taskly.logout}
                className="btn-ghost text-sm px-3 py-2"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {renderCurrentView()}
      </main>

      {/* Card Modal */}
      {taskly.uiState.selectedCardId && taskly.uiState.currentView === 'card' && <CardModal />}
    </div>
  );
}

export default function RootPage() {
  return (
    <TasklyProvider>
      <TasklyApp />
    </TasklyProvider>
  );
}