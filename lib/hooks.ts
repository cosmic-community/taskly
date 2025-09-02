'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AppState, 
  Board, 
  Column, 
  Card, 
  User,
  UIState,
  AuthResponse,
  LoginCredentials,
  SignUpCredentials,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  ViewMode
} from '@/types';
import {
  getUserBoards,
  createBoard as createBoardApi,
  updateBoard as updateBoardApi,
  deleteBoard as deleteBoardApi,
  getBoardColumns,
  createColumn as createColumnApi,
  updateColumn as updateColumnApi,
  deleteColumn as deleteColumnApi,
  getColumnCards,
  getBoardCards,
  createCard as createCardApi,
  updateCard as updateCardApi,
  deleteCard as deleteCardApi,
} from '@/lib/cosmic';

// Storage keys
const STORAGE_KEY = 'taskly_data';
const TOKEN_KEY = 'taskly_token';

// API helper functions
const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || 'Request failed');
  }

  return response.json();
};

// Main Taskly hook
export function useTaskly() {
  // Core state
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });

  // UI state
  const [uiState, setUIState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem(TOKEN_KEY);
      
      if (token) {
        // Verify token and load user data
        const userData = await apiRequest('/api/auth/verify');
        setAppState(prev => ({ ...prev, user: userData.user }));
        setUIState(prev => ({ ...prev, currentView: 'boards' }));
        
        // Load user's boards
        await loadUserBoards(userData.user.id);
      } else {
        setUIState(prev => ({ ...prev, currentView: 'auth' }));
      }
    } catch (error) {
      console.error('App initialization error:', error);
      localStorage.removeItem(TOKEN_KEY);
      setUIState(prev => ({ ...prev, currentView: 'auth' }));
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication functions
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const authResponse: AuthResponse = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      localStorage.setItem(TOKEN_KEY, authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadUserBoards(authResponse.user.id);
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate password confirmation
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const authResponse: AuthResponse = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      localStorage.setItem(TOKEN_KEY, authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Initialize with empty boards array for new user
      setAppState(prev => ({ ...prev, boards: [], columns: [], cards: [] }));
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error instanceof Error ? error.message : 'Sign up failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
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
    setError(null);
  };

  // Data loading functions
  const loadUserBoards = async (userId: string) => {
    try {
      const boards = await getUserBoards(userId);
      setAppState(prev => ({ ...prev, boards }));
    } catch (error) {
      console.error('Error loading boards:', error);
      setError('Failed to load boards');
    }
  };

  const loadBoardData = async (boardId: string) => {
    try {
      setIsLoading(true);
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId),
      ]);

      setAppState(prev => ({
        ...prev,
        columns,
        cards,
      }));
    } catch (error) {
      console.error('Error loading board data:', error);
      setError('Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  };

  // Board operations
  const createBoard = async (form: CreateBoardForm) => {
    if (!appState.user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      const order = Math.max(0, ...appState.boards.map(b => b.order)) + 1;
      const newBoard = await createBoardApi(form.title, appState.user.id, order);
      
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, newBoard],
      }));
      
      return newBoard;
    } catch (error) {
      console.error('Error creating board:', error);
      setError('Failed to create board');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => {
    try {
      await updateBoardApi(id, updates);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board =>
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      console.error('Error updating board:', error);
      setError('Failed to update board');
      throw error;
    }
  };

  const deleteBoard = async (id: string) => {
    try {
      await deleteBoardApi(id);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));

      // Navigate back to boards if current board was deleted
      if (uiState.selectedBoardId === id) {
        setUIState(prev => ({
          ...prev,
          currentView: 'boards',
          selectedBoardId: null,
        }));
      }
    } catch (error) {
      console.error('Error deleting board:', error);
      setError('Failed to delete board');
      throw error;
    }
  };

  // Column operations
  const createColumn = async (boardId: string, form: CreateColumnForm) => {
    try {
      const boardColumns = appState.columns.filter(c => c.boardId === boardId);
      const order = Math.max(0, ...boardColumns.map(c => c.order)) + 1;
      const newColumn = await createColumnApi(boardId, form.title, order);
      
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, newColumn],
      }));
      
      return newColumn;
    } catch (error) {
      console.error('Error creating column:', error);
      setError('Failed to create column');
      throw error;
    }
  };

  const updateColumn = async (id: string, updates: Partial<Pick<Column, 'title'>>) => {
    try {
      await updateColumnApi(id, updates);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column =>
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      console.error('Error updating column:', error);
      setError('Failed to update column');
      throw error;
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      await deleteColumnApi(id);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      console.error('Error deleting column:', error);
      setError('Failed to delete column');
      throw error;
    }
  };

  const reorderColumns = async (boardId: string, columnIds: string[]) => {
    try {
      // Optimistic update
      const reorderedColumns = columnIds.map((id, index) => {
        const column = appState.columns.find(c => c.id === id);
        return column ? { ...column, order: index } : null;
      }).filter((col): col is Column => col !== null);

      setAppState(prev => ({
        ...prev,
        columns: [
          ...prev.columns.filter(c => c.boardId !== boardId),
          ...reorderedColumns,
        ],
      }));

      // Update each column's order in the backend
      await Promise.all(
        reorderedColumns.map(column => 
          updateColumnApi(column.id, { order: column.order })
        )
      );
    } catch (error) {
      console.error('Error reordering columns:', error);
      setError('Failed to reorder columns');
      // Reload to revert optimistic update
      if (uiState.selectedBoardId) {
        loadBoardData(uiState.selectedBoardId);
      }
      throw error;
    }
  };

  // Card operations
  const createCard = async (columnId: string, form: CreateCardForm) => {
    const column = appState.columns.find(c => c.id === columnId);
    if (!column) throw new Error('Column not found');

    try {
      const columnCards = appState.cards.filter(c => c.columnId === columnId);
      const order = Math.max(0, ...columnCards.map(c => c.order)) + 1;
      
      const newCard = await createCardApi(
        column.boardId,
        columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        order
      );
      
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, newCard],
      }));
      
      return newCard;
    } catch (error) {
      console.error('Error creating card:', error);
      setError('Failed to create card');
      throw error;
    }
  };

  const updateCard = async (id: string, updates: Partial<EditCardForm>) => {
    try {
      await updateCardApi(id, updates);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      console.error('Error updating card:', error);
      setError('Failed to update card');
      throw error;
    }
  };

  const deleteCard = async (id: string) => {
    try {
      await deleteCardApi(id);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting card:', error);
      setError('Failed to delete card');
      throw error;
    }
  };

  const moveCard = async (cardId: string, targetColumnId: string, newOrder: number) => {
    const card = appState.cards.find(c => c.id === cardId);
    if (!card) return;

    try {
      // Optimistic update
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(c =>
          c.id === cardId
            ? { ...c, columnId: targetColumnId, order: newOrder }
            : c
        ),
      }));

      await updateCardApi(cardId, {
        columnId: targetColumnId,
        order: newOrder,
      });
    } catch (error) {
      console.error('Error moving card:', error);
      setError('Failed to move card');
      // Reload to revert optimistic update
      if (uiState.selectedBoardId) {
        loadBoardData(uiState.selectedBoardId);
      }
      throw error;
    }
  };

  // Navigation functions
  const navigateToView = (view: ViewMode, boardId?: string, cardId?: string) => {
    setUIState(prev => ({
      ...prev,
      currentView: view,
      selectedBoardId: boardId || prev.selectedBoardId,
      selectedCardId: cardId || prev.selectedCardId,
    }));

    // Load board data when navigating to board view
    if (view === 'board' && boardId) {
      loadBoardData(boardId);
    }
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
    setError(null);
  };

  // Utility functions
  const clearError = () => setError(null);

  // Computed values
  const currentBoard = useMemo(() => {
    return uiState.selectedBoardId
      ? appState.boards.find(b => b.id === uiState.selectedBoardId)
      : null;
  }, [appState.boards, uiState.selectedBoardId]);

  const currentBoardColumns = useMemo(() => {
    if (!uiState.selectedBoardId) return [];
    return appState.columns
      .filter(c => c.boardId === uiState.selectedBoardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns, uiState.selectedBoardId]);

  const currentBoardCards = useMemo(() => {
    if (!uiState.selectedBoardId) return [];
    return appState.cards
      .filter(c => c.boardId === uiState.selectedBoardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards, uiState.selectedBoardId]);

  const getColumnCards = useCallback((columnId: string) => {
    return currentBoardCards
      .filter(c => c.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  }, [currentBoardCards]);

  const selectedCard = useMemo(() => {
    return uiState.selectedCardId
      ? appState.cards.find(c => c.id === uiState.selectedCardId)
      : null;
  }, [appState.cards, uiState.selectedCardId]);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,

    // Authentication
    login,
    signUp,
    logout,

    // Navigation
    navigateToView,
    setAuthMode,

    // Board operations
    createBoard,
    updateBoard,
    deleteBoard,

    // Column operations
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,

    // Card operations
    createCard,
    updateCard,
    deleteCard,
    moveCard,

    // Computed values
    currentBoard,
    currentBoardColumns,
    currentBoardCards,
    getColumnCards,
    selectedCard,

    // Utilities
    clearError,
    loadBoardData,
  };
}