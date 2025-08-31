'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppState, Board, Column, Card, ViewMode, UIState } from '@/types';
import { storageService, calculateNewOrder, getNextOrder } from '@/lib/storage';
import { nanoid } from 'nanoid';

export const useTaskly = () => {
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
  });
  const [uiState, setUIState] = useState<UIState>({
    currentView: 'boards',
    selectedBoardId: null,
    selectedCardId: null,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data on mount
  useEffect(() => {
    const data = storageService.loadData();
    setAppState(data);
    setIsLoaded(true);
  }, []);

  // Save data whenever appState changes
  useEffect(() => {
    if (isLoaded) {
      storageService.saveData(appState);
    }
  }, [appState, isLoaded]);

  // Board operations
  const createBoard = useCallback((title: string): string => {
    const existingOrders = appState.boards.map(b => b.order);
    const newBoard: Board = {
      id: nanoid(),
      title,
      order: getNextOrder(existingOrders),
      isArchived: false,
    };

    setAppState(prev => ({
      ...prev,
      boards: [...prev.boards, newBoard],
    }));

    return newBoard.id;
  }, [appState.boards]);

  const updateBoard = useCallback((id: string, updates: Partial<Board>) => {
    setAppState(prev => ({
      ...prev,
      boards: prev.boards.map(board => 
        board.id === id ? { ...board, ...updates } : board
      ),
    }));
  }, []);

  const deleteBoard = useCallback((id: string) => {
    setAppState(prev => ({
      ...prev,
      boards: prev.boards.filter(board => board.id !== id),
      columns: prev.columns.filter(column => column.boardId !== id),
      cards: prev.cards.filter(card => card.boardId !== id),
    }));
  }, []);

  // Column operations
  const createColumn = useCallback((boardId: string, title: string): string => {
    const existingOrders = appState.columns
      .filter(c => c.boardId === boardId)
      .map(c => c.order);
    
    const newColumn: Column = {
      id: nanoid(),
      boardId,
      title,
      order: getNextOrder(existingOrders),
    };

    setAppState(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }));

    return newColumn.id;
  }, [appState.columns]);

  const updateColumn = useCallback((id: string, updates: Partial<Column>) => {
    setAppState(prev => ({
      ...prev,
      columns: prev.columns.map(column => 
        column.id === id ? { ...column, ...updates } : column
      ),
    }));
  }, []);

  const deleteColumn = useCallback((id: string) => {
    setAppState(prev => ({
      ...prev,
      columns: prev.columns.filter(column => column.id !== id),
      cards: prev.cards.filter(card => card.columnId !== id),
    }));
  }, []);

  const reorderColumns = useCallback((boardId: string, columnIds: string[]) => {
    const columns = appState.columns
      .filter(c => c.boardId === boardId)
      .sort((a, b) => a.order - b.order);

    const updates: { id: string; order: number }[] = [];
    
    columnIds.forEach((id, index) => {
      const currentColumn = columns.find(c => c.id === id);
      if (currentColumn) {
        const newOrder = (index + 1) * 100;
        if (currentColumn.order !== newOrder) {
          updates.push({ id, order: newOrder });
        }
      }
    });

    if (updates.length > 0) {
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => {
          const update = updates.find(u => u.id === column.id);
          return update ? { ...column, order: update.order } : column;
        }),
      }));
    }
  }, [appState.columns]);

  // Card operations
  const createCard = useCallback((boardId: string, columnId: string, data: { title: string; description?: string; labels?: string[]; dueDate?: string }): string => {
    const existingOrders = appState.cards
      .filter(c => c.columnId === columnId)
      .map(c => c.order);
    
    const newCard: Card = {
      id: nanoid(),
      boardId,
      columnId,
      title: data.title,
      description: data.description,
      labels: data.labels,
      dueDate: data.dueDate,
      order: getNextOrder(existingOrders),
      isArchived: false,
    };

    setAppState(prev => ({
      ...prev,
      cards: [...prev.cards, newCard],
    }));

    return newCard.id;
  }, [appState.cards]);

  const updateCard = useCallback((id: string, updates: Partial<Card>) => {
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ),
    }));
  }, []);

  const deleteCard = useCallback((id: string) => {
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id),
    }));
  }, []);

  const moveCard = useCallback((cardId: string, newColumnId: string, newOrder: number) => {
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === cardId 
          ? { ...card, columnId: newColumnId, order: newOrder }
          : card
      ),
    }));
  }, []);

  // UI operations
  const setCurrentView = useCallback((view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  const selectBoard = useCallback((boardId: string | null) => {
    setUIState(prev => ({ 
      ...prev, 
      selectedBoardId: boardId,
      currentView: boardId ? 'board' : 'boards',
    }));
  }, []);

  const selectCard = useCallback((cardId: string | null) => {
    setUIState(prev => ({ 
      ...prev, 
      selectedCardId: cardId,
      currentView: cardId ? 'card' : prev.currentView,
    }));
  }, []);

  // Derived state
  const activeBoards = appState.boards.filter(board => !board.isArchived);
  const selectedBoard = uiState.selectedBoardId 
    ? appState.boards.find(b => b.id === uiState.selectedBoardId) || null
    : null;
  const selectedCard = uiState.selectedCardId 
    ? appState.cards.find(c => c.id === uiState.selectedCardId) || null
    : null;

  const getBoardColumns = useCallback((boardId: string): Column[] => {
    return appState.columns
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns]);

  const getColumnCards = useCallback((columnId: string): Card[] => {
    return appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  return {
    // State
    appState,
    uiState,
    isLoaded,
    activeBoards,
    selectedBoard,
    selectedCard,

    // Board operations
    createBoard,
    updateBoard,
    deleteBoard,

    // Column operations
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    getBoardColumns,

    // Card operations
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    getColumnCards,

    // UI operations
    setCurrentView,
    selectBoard,
    selectCard,

    // Utilities
    calculateNewOrder,
  };
};