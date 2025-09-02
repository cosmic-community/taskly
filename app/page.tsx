'use client';

import { useEffect } from 'react';
import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';

export default function Home() {
  const taskly = useTaskly();

  useEffect(() => {
    // Try to authenticate with stored token
    if (taskly.user) {
      taskly.authenticateWithToken();
    }
  }, []);

  // Show loading state during initial auth check
  if (taskly.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth panel if no user
  if (!taskly.user) {
    return <AuthPanel />;
  }

  // Show appropriate panel based on current view
  switch (taskly.uiState.currentView) {
    case 'board':
      if (taskly.selectedCard) {
        return <BoardPanel />;
      }
      return <BoardPanel />;
    case 'boards':
    default:
      return <BoardsPanel />;
  }
}