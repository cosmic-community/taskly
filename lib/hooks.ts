'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppState, User, Board, Column, Card, UIState, AuthResponse, LoginCredentials, SignUpCredentials, ViewMode } from '@/types';

// Initialize empty app state
const initialAppState: AppState = {
  boards: [],
  columns: [],
  cards: [],
  user: null,
};

// Initialize UI state
const initialUIState: UIState = {
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

export function useTaskly() {
  // Core state
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is already logged in
        const token = localStorage.getItem('taskly_token');
        if (token) {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const { user } = await response.json();
            setAppState(prev => ({ ...prev, user }));
            setUIState(prev => ({ ...prev, currentView: 'boards' }));
            
            // Load user's boards
            await loadBoards();
          } else {
            // Invalid token, remove it
            localStorage.removeItem('taskly_token');
          }
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Auth functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token and user
      localStorage.setItem('taskly_token', data.token);
      setAppState(prev => ({ ...prev, user: data.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadBoards();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      // Store token and user
      localStorage.setItem('taskly_token', data.token);
      setAppState(prev => ({ ...prev, user: data.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign up failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly_token');
    setAppState(initialAppState);
    setUIState(initialUIState);
  }, []);

  // Board functions
  const loadBoards = useCallback(async () => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch('/api/boards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const boards = await response.json();
        setAppState(prev => ({ ...prev, boards }));
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  }, []);

  const createBoard = useCallback(async (title: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create board');
      }

      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, data.board],
      }));

      return data.board;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create board');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBoard = useCallback(async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/boards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update board');
      }

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board =>
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board');
      throw error;
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));

      // Navigate away if current board was deleted
      if (uiState.selectedBoardId === id) {
        setUIState(prev => ({
          ...prev,
          currentView: 'boards',
          selectedBoardId: null,
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete board');
      throw error;
    }
  }, [uiState.selectedBoardId]);

  // Column functions
  const loadColumns = useCallback(async (boardId: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/columns?boardId=${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const columns = await response.json();
        setAppState(prev => ({
          ...prev,
          columns: prev.columns.filter(col => col.boardId !== boardId).concat(columns),
        }));
      }
    } catch (error) {
      console.error('Failed to load columns:', error);
    }
  }, []);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ boardId, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create column');
      }

      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, data.column],
      }));

      return data.column;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create column');
      throw error;
    }
  }, []);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<Column, 'title'>>) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/columns/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update column');
      }

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column =>
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update column');
      throw error;
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete column');
      }

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete column');
      throw error;
    }
  }, []);

  // Card functions
  const loadCards = useCallback(async (boardId: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/cards?boardId=${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const cards = await response.json();
        setAppState(prev => ({
          ...prev,
          cards: prev.cards.filter(card => card.boardId !== boardId).concat(cards),
        }));
      }
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  }, []);

  const createCard = useCallback(async (
    boardId: string,
    columnId: string,
    title: string,
    description?: string,
    labels?: string[],
    dueDate?: string
  ) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          boardId,
          columnId,
          title,
          description,
          labels,
          dueDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create card');
      }

      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, data.card],
      }));

      return data.card;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create card');
      throw error;
    }
  }, []);

  const updateCard = useCallback(async (
    id: string,
    updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId'>>
  ) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update card');
      throw error;
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete card');
      throw error;
    }
  }, []);

  const moveCard = useCallback(async (cardId: string, targetColumnId: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ columnId: targetColumnId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to move card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId ? { ...card, columnId: targetColumnId } : card
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to move card');
      throw error;
    }
  }, []);

  // UI functions
  const setCurrentView = useCallback((view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setSelectedBoardId = useCallback((boardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedBoardId: boardId }));
  }, []);

  const setSelectedCardId = useCallback((cardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: cardId }));
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed values
  const selectedBoard = appState.boards.find(board => board.id === uiState.selectedBoardId);
  const selectedCard = appState.cards.find(card => card.id === uiState.selectedCardId);
  const boardColumns = appState.columns.filter(column => column.boardId === uiState.selectedBoardId);
  const boardCards = appState.cards.filter(card => card.boardId === uiState.selectedBoardId);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,

    // Computed
    selectedBoard,
    selectedCard,
    boardColumns,
    boardCards,

    // Auth functions
    login,
    signUp,
    logout,

    // Board functions
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,

    // Column functions
    loadColumns,
    createColumn,
    updateColumn,
    deleteColumn,

    // Card functions
    loadCards,
    createCard,
    updateCard,
    deleteCard,
    moveCard,

    // UI functions
    setCurrentView,
    setSelectedBoardId,
    setSelectedCardId,
    setAuthMode,
    clearError,
  };
}