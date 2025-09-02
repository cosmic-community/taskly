'use client';

import { useEffect } from 'react';
import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';

export default function Home() {
  const taskly = useTaskly();

  useEffect(() => {
    // Try to authenticate with stored token on mount
    taskly.authenticateWithToken();
  }, []);

  // Show loading state during initial authentication
  if (taskly.isLoading && taskly.uiState.currentView === 'auth') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth panel if not authenticated
  if (!taskly.user) {
    return <AuthPanel />;
  }

  // Main application views
  if (taskly.uiState.currentView === 'boards') {
    return <BoardsPanel />;
  }

  if (taskly.uiState.currentView === 'board' && taskly.uiState.selectedBoardId) {
    const selectedBoard = taskly.boards.find(board => board.id === taskly.uiState.selectedBoardId);
    if (selectedBoard) {
      return (
        <>
          <BoardPanel board={selectedBoard} />
          {taskly.uiState.selectedCardId && <CardModal />}
        </>
      );
    }
  }

  // Fallback to boards view
  return <BoardsPanel />;
}