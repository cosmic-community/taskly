'use client';

import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import { Board } from '@/types';

// Define the props interface for BoardView component
interface BoardViewProps {
  board: Board | null;
}

// BoardView component with proper TypeScript interface
function BoardView({ board }: BoardViewProps) {
  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Board not found</h2>
          <p className="text-muted-foreground">The selected board could not be loaded.</p>
        </div>
      </div>
    );
  }

  return <BoardPanel board={board} />;
}

export default function Home() {
  const taskly = useTaskly();

  // Show loading state
  if (taskly.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication panel if not logged in
  if (!taskly.appState.user) {
    return <AuthPanel />;
  }

  // Show boards panel if no specific board is selected
  if (taskly.uiState.currentView === 'boards' || !taskly.uiState.selectedBoardId) {
    return <BoardsPanel />;
  }

  // Show board panel for selected board
  if (taskly.uiState.currentView === 'board' && taskly.uiState.selectedBoardId) {
    const selectedBoard = taskly.appState.boards.find(
      board => board.id === taskly.uiState.selectedBoardId
    ) || null;

    // This is line 83 - now properly typed with BoardViewProps interface
    return <BoardView board={selectedBoard} />;
  }

  // Default fallback
  return <BoardsPanel />;
}