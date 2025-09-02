'use client';

import { useTaskly } from '@/lib/hooks';
import AuthPanel from '@/components/AuthPanel';
import BoardsPanel from '@/components/BoardsPanel';
import BoardPanel from '@/components/BoardPanel';
import CardModal from '@/components/CardModal';

export default function HomePage() {
  const taskly = useTaskly();

  // Show auth panel if user is not authenticated
  if (!taskly.appState.user) {
    return <AuthPanel />;
  }

  // Get the selected card for modal
  const selectedCard = taskly.uiState.selectedCardId
    ? taskly.appState.cards.find(card => card.id === taskly.uiState.selectedCardId)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      {taskly.uiState.currentView === 'boards' && <BoardsPanel />}
      {taskly.uiState.currentView === 'board' && <BoardPanel />}

      {/* Card Modal */}
      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => taskly.setSelectedCard(null)}
        />
      )}
    </div>
  );
}