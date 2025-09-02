'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppState, Board, Column, Card, ViewMode, UIState, User, LoginCredentials, SignUpCredentials, AuthResponse } from '@/types';
import { nanoid } from 'nanoid';

export const useTaskly = () => {
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });
  const [uiState, setUIState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user session on mount
  useEffect(() => {
    const loadSession = async () => {
      const token = localStorage.getItem('taskly-token');
      if (token) {
        try {
          const response = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const { user } = await response.json();
            setAppState(prev => ({ ...prev, user }));
            await loadUserData(user.id);
            setUIState(prev => ({ ...prev, currentView: 'boards' }));
          } else {
            localStorage.removeItem('taskly-token');
          }
        } catch (error) {
          console.error('Session verification failed:', error);
          localStorage.removeItem('taskly-token');
        }
      }
      setIsLoaded(true);
    };

    loadSession();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('taskly-token');
      
      const [boardsRes, columnsRes, cardsRes] = await Promise.all([
        fetch(`/api/boards?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/columns?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/cards?userId=${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [boards, columns, cards] = await Promise.all([
        boardsRes.json(),
        columnsRes.json(),
        cardsRes.json(),
      ]);

      setAppState(prev => ({
        ...prev,
        boards: boards || [],
        columns: columns || [],
        cards: cards || [],
      }));
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load your data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication operations
  const signUp = useCallback(async (credentials: SignUpCredentials): Promise<void> => {
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sign up failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Store token
      localStorage.setItem('taskly-token', authData.token);
      
      // Update app state
      setAppState(prev => ({ ...prev, user: authData.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user data
      await loadUserData(authData.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const authData: AuthResponse = await response.json();
      
      // Store token
      localStorage.setItem('taskly-token', authData.token);
      
      // Update app state
      setAppState(prev => ({ ...prev, user: authData.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user data
      await loadUserData(authData.user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly-token');
    setAppState({
      boards: [],
      columns: [],
      cards: [],
      user: null,
    });
    setUIState({
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
    });
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
    setError(null);
  }, []);

  // Board operations
  const createBoard = useCallback(async (title: string): Promise<string> => {
    if (!appState.user) throw new Error('User not authenticated');
    
    const tempId = nanoid();
    const order = Math.max(...appState.boards.map(b => b.order), 0) + 100;
    
    // Optimistic update
    const newBoard: Board = {
      id: tempId,
      title,
      order,
      isArchived: false,
      userId: appState.user.id,
    };
    
    setAppState(prev => ({
      ...prev,
      boards: [...prev.boards, newBoard],
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, order }),
      });

      if (!response.ok) throw new Error('Failed to create board');

      const createdBoard = await response.json();
      
      // Replace optimistic update with real data
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(b => b.id === tempId ? { ...createdBoard, userId: appState.user!.id } : b),
      }));

      return createdBoard.id;
    } catch (error) {
      // Revert optimistic update
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(b => b.id !== tempId),
      }));
      throw error;
    }
  }, [appState.boards, appState.user]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      boards: prev.boards.map(board => 
        board.id === id ? { ...board, ...updates } : board
      ),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/boards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update board');
    } catch (error) {
      // Revert optimistic update
      await loadUserData(appState.user!.id);
      throw error;
    }
  }, [appState.user]);

  const deleteBoard = useCallback(async (id: string) => {
    // Store for potential revert
    const boardToDelete = appState.boards.find(b => b.id === id);
    const columnsToDelete = appState.columns.filter(c => c.boardId === id);
    const cardsToDelete = appState.cards.filter(c => c.boardId === id);
    
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      boards: prev.boards.filter(board => board.id !== id),
      columns: prev.columns.filter(column => column.boardId !== id),
      cards: prev.cards.filter(card => card.boardId !== id),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete board');
    } catch (error) {
      // Revert optimistic update
      if (boardToDelete) {
        setAppState(prev => ({
          ...prev,
          boards: [...prev.boards, boardToDelete],
          columns: [...prev.columns, ...columnsToDelete],
          cards: [...prev.cards, ...cardsToDelete],
        }));
      }
      throw error;
    }
  }, [appState.boards, appState.columns, appState.cards]);

  // Column operations
  const createColumn = useCallback(async (boardId: string, title: string): Promise<string> => {
    const tempId = nanoid();
    const order = Math.max(...appState.columns.filter(c => c.boardId === boardId).map(c => c.order), 0) + 100;
    
    // Optimistic update
    const newColumn: Column = {
      id: tempId,
      boardId,
      title,
      order,
    };
    
    setAppState(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn],
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boardId, title, order }),
      });

      if (!response.ok) throw new Error('Failed to create column');

      const createdColumn = await response.json();
      
      // Replace optimistic update with real data
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(c => c.id === tempId ? createdColumn : c),
      }));

      return createdColumn.id;
    } catch (error) {
      // Revert optimistic update
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.id !== tempId),
      }));
      throw error;
    }
  }, [appState.columns]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      columns: prev.columns.map(column => 
        column.id === id ? { ...column, ...updates } : column
      ),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/columns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update column');
    } catch (error) {
      // Revert optimistic update
      await loadUserData(appState.user!.id);
      throw error;
    }
  }, [appState.user]);

  const deleteColumn = useCallback(async (id: string) => {
    // Store for potential revert
    const columnToDelete = appState.columns.find(c => c.id === id);
    const cardsToDelete = appState.cards.filter(c => c.columnId === id);
    
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      columns: prev.columns.filter(column => column.id !== id),
      cards: prev.cards.filter(card => card.columnId !== id),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete column');
    } catch (error) {
      // Revert optimistic update
      if (columnToDelete) {
        setAppState(prev => ({
          ...prev,
          columns: [...prev.columns, columnToDelete],
          cards: [...prev.cards, ...cardsToDelete],
        }));
      }
      throw error;
    }
  }, [appState.columns, appState.cards]);

  const reorderColumns = useCallback(async (boardId: string, columnIds: string[]) => {
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
      // Optimistic update
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => {
          const update = updates.find(u => u.id === column.id);
          return update ? { ...column, order: update.order } : column;
        }),
      }));

      try {
        const token = localStorage.getItem('taskly-token');
        await fetch('/api/columns/reorder', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ updates }),
        });
      } catch (error) {
        // Revert optimistic update
        await loadUserData(appState.user!.id);
        throw error;
      }
    }
  }, [appState.columns, appState.user]);

  // Card operations
  const createCard = useCallback(async (boardId: string, columnId: string, data: { title: string; description?: string; labels?: string[]; dueDate?: string }): Promise<string> => {
    const tempId = nanoid();
    const order = Math.max(...appState.cards.filter(c => c.columnId === columnId).map(c => c.order), 0) + 100;
    
    // Optimistic update
    const newCard: Card = {
      id: tempId,
      boardId,
      columnId,
      title: data.title,
      description: data.description,
      labels: data.labels,
      dueDate: data.dueDate,
      order,
      isArchived: false,
    };
    
    setAppState(prev => ({
      ...prev,
      cards: [...prev.cards, newCard],
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, boardId, columnId, order }),
      });

      if (!response.ok) throw new Error('Failed to create card');

      const createdCard = await response.json();
      
      // Replace optimistic update with real data
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(c => c.id === tempId ? createdCard : c),
      }));

      return createdCard.id;
    } catch (error) {
      // Revert optimistic update
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(c => c.id !== tempId),
      }));
      throw error;
    }
  }, [appState.cards]);

  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update card');
    } catch (error) {
      // Revert optimistic update
      await loadUserData(appState.user!.id);
      throw error;
    }
  }, [appState.user]);

  const deleteCard = useCallback(async (id: string) => {
    // Store for potential revert
    const cardToDelete = appState.cards.find(c => c.id === id);
    
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.filter(card => card.id !== id),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to delete card');
    } catch (error) {
      // Revert optimistic update
      if (cardToDelete) {
        setAppState(prev => ({
          ...prev,
          cards: [...prev.cards, cardToDelete],
        }));
      }
      throw error;
    }
  }, [appState.cards]);

  const moveCard = useCallback(async (cardId: string, newColumnId: string, newOrder: number) => {
    // Optimistic update
    setAppState(prev => ({
      ...prev,
      cards: prev.cards.map(card => 
        card.id === cardId 
          ? { ...card, columnId: newColumnId, order: newOrder }
          : card
      ),
    }));

    try {
      const token = localStorage.getItem('taskly-token');
      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ columnId: newColumnId, order: newOrder }),
      });

      if (!response.ok) throw new Error('Failed to move card');
    } catch (error) {
      // Revert optimistic update
      await loadUserData(appState.user!.id);
      throw error;
    }
  }, [appState.user]);

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
      currentView: cardId ? 'card' : (prev.selectedBoardId ? 'board' : 'boards'),
    }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
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
    isLoading,
    error,
    activeBoards,
    selectedBoard,
    selectedCard,

    // Auth operations
    signUp,
    login,
    logout,
    setAuthMode,
    clearError,

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
  };
};