'use client';

import { useEffect } from 'react';
import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';

export default function HomePage() {
  const taskly = useTaskly();

  // Try to authenticate with stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('taskly_token');
    if (token && !taskly.user) {
      taskly.authenticateWithToken(token);
    }
  }, [taskly]);

  // Render based on current view
  switch (taskly.uiState.currentView) {
    case 'auth':
      return <AuthPanel />;
      
    case 'boards':
      return <BoardsPanel />;
      
    case 'board':
      return <BoardPanel />;
      
    case 'card':
      return (
        <>
          <BoardPanel />
          {taskly.selectedCard && (
            <CardModal 
              cardId={taskly.selectedCard.id} 
              onClose={() => taskly.selectCard(null)}
            />
          )}
        </>
      );
      
    default:
      return <AuthPanel />;
  }
}