'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, User, Board, Column, Card, AuthResponse, LoginCredentials, SignUpCredentials, ViewMode, UIState } from '@/types';

// API endpoints
const API_BASE = '/api';

// Custom hook for localStorage with SSR safety
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    } finally {
      setIsInitialized(true);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue, isInitialized] as const;
}

// API helper functions
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'An error occurred' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Main Taskly hook
export function useTaskly() {
  // UI State
  const [uiState, setUiState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });

  // App State
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auth token storage
  const [authToken, setAuthToken, isTokenInitialized] = useLocalStorage<string | null>('auth_token', null);

  // Initialize auth state
  useEffect(() => {
    if (isTokenInitialized && authToken) {
      verifyToken();
    }
  }, [isTokenInitialized, authToken]);

  // Helper functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUiState(prev => ({ ...prev, authMode: mode }));
    clearError();
  }, [clearError]);

  // Auth functions
  const checkAuth = useCallback(async () => {
    if (!authToken) return false;
    
    try {
      const { user } = await apiRequest<{ user: User }>(`${API_BASE}/auth/verify`);
      setAppState(prev => ({ ...prev, user }));
      return true;
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthToken(null);
      setAppState(prev => ({ ...prev, user: null }));
      return false;
    }
  }, [authToken, setAuthToken]);

  const verifyToken = useCallback(async () => {
    if (!authToken) return;

    try {
      setIsLoading(true);
      const { user } = await apiRequest<{ user: User }>(`${API_BASE}/auth/verify`);
      setAppState(prev => ({ ...prev, user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      console.error('Token verification failed:', error);
      setAuthToken(null);
      setAppState(prev => ({ ...prev, user: null }));
    } finally {
      setIsLoading(false);
    }
  }, [authToken, setAuthToken]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const authResponse = await apiRequest<AuthResponse>(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      setAuthToken(authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthToken]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    if (credentials.password !== credentials.confirmPassword) {
      setError('Passwords do not match');
      throw new Error('Passwords do not match');
    }

    try {
      setIsLoading(true);
      setError(null);

      const authResponse = await apiRequest<AuthResponse>(`${API_BASE}/auth/signup`, {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      setAuthToken(authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign up failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setAuthToken]);

  const logout = useCallback(() => {
    setAuthToken(null);
    setAppState({
      boards: [],
      columns: [],
      cards: [],
      user: null,
    });
    setUiState({
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
    });
    clearError();
  }, [setAuthToken, clearError]);

  // UI State functions
  const setView = useCallback((view: ViewMode) => {
    setUiState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setCurrentView = useCallback((view: ViewMode) => {
    setUiState(prev => ({ ...prev, currentView: view }));
  }, []);

  const selectBoard = useCallback((boardId: string | null) => {
    setUiState(prev => ({ 
      ...prev, 
      selectedBoardId: boardId,
      currentView: boardId ? 'board' : 'boards'
    }));
  }, []);

  const setSelectedCardId = useCallback((cardId: string | null) => {
    setUiState(prev => ({ ...prev, selectedCardId: cardId }));
  }, []);

  // Getter functions
  const getBoardById = useCallback((boardId: string): Board | null => {
    return appState.boards.find(board => board.id === boardId) || null;
  }, [appState.boards]);

  const getColumnsByBoardId = useCallback((boardId: string): Column[] => {
    return appState.columns.filter(column => column.boardId === boardId);
  }, [appState.columns]);

  const getCardsByColumnId = useCallback((columnId: string): Card[] => {
    return appState.cards.filter(card => card.columnId === columnId && !card.isArchived);
  }, [appState.cards]);

  const getCardById = useCallback((cardId: string): Card | null => {
    return appState.cards.find(card => card.id === cardId) || null;
  }, [appState.cards]);

  // Board functions
  const loadBoards = useCallback(async () => {
    if (!appState.user) return;

    try {
      setIsLoading(true);
      const boards = await apiRequest<Board[]>(`${API_BASE}/boards`);
      setAppState(prev => ({ ...prev, boards }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user]);

  const createBoard = useCallback(async (title: string) => {
    if (!appState.user) return;

    try {
      setIsLoading(true);
      const newBoard = await apiRequest<Board>(`${API_BASE}/boards`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });

      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, newBoard],
      }));

      return newBoard;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create board');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appState.user]);

  const updateBoard = useCallback(async (
    boardId: string, 
    updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>
  ) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/boards/${boardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board =>
          board.id === boardId ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update board');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBoard = useCallback(async (boardId: string) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/boards/${boardId}`, {
        method: 'DELETE',
      });

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== boardId),
        columns: prev.columns.filter(column => column.boardId !== boardId),
        cards: prev.cards.filter(card => card.boardId !== boardId),
      }));

      // If we're viewing the deleted board, go back to boards view
      if (uiState.selectedBoardId === boardId) {
        setUiState(prev => ({
          ...prev,
          currentView: 'boards',
          selectedBoardId: null,
          selectedCardId: null,
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete board');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedBoardId]);

  // Column functions
  const loadColumns = useCallback(async (boardId: string) => {
    try {
      setIsLoading(true);
      const columns = await apiRequest<Column[]>(`${API_BASE}/columns?boardId=${boardId}`);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(col => col.boardId !== boardId).concat(columns),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load columns');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addColumn = useCallback(async (boardId: string, title: string) => {
    return await createColumn(boardId, title);
  }, []);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    try {
      setIsLoading(true);
      const newColumn = await apiRequest<Column>(`${API_BASE}/columns`, {
        method: 'POST',
        body: JSON.stringify({ boardId, title }),
      });

      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, newColumn],
      }));

      return newColumn;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create column');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateColumn = useCallback(async (
    columnId: string,
    updates: Partial<Pick<Column, 'title' | 'order'>>
  ) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/columns/${columnId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column =>
          column.id === columnId ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update column');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteColumn = useCallback(async (columnId: string) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/columns/${columnId}`, {
        method: 'DELETE',
      });

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== columnId),
        cards: prev.cards.filter(card => card.columnId !== columnId),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete column');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Card functions
  const loadCards = useCallback(async (boardId: string) => {
    try {
      setIsLoading(true);
      const cards = await apiRequest<Card[]>(`${API_BASE}/cards?boardId=${boardId}`);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.boardId !== boardId).concat(cards),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCard = useCallback(async (
    columnId: string,
    title: string,
    description?: string,
    labels?: string[],
    dueDate?: string
  ) => {
    return await createCard(columnId, title, description, labels, dueDate);
  }, []);

  const createCard = useCallback(async (
    columnId: string,
    title: string,
    description?: string,
    labels?: string[],
    dueDate?: string
  ) => {
    const column = appState.columns.find(col => col.id === columnId);
    if (!column) {
      setError('Column not found');
      return;
    }

    try {
      setIsLoading(true);
      const newCard = await apiRequest<Card>(`${API_BASE}/cards`, {
        method: 'POST',
        body: JSON.stringify({
          boardId: column.boardId,
          columnId,
          title,
          description,
          labels,
          dueDate,
        }),
      });

      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, newCard],
      }));

      return newCard;
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create card');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns]);

  const updateCard = useCallback(async (
    cardId: string,
    updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>
  ) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update card');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const moveCard = useCallback(async (cardId: string, columnId: string, newOrder: number) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/cards/${cardId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ columnId, order: newOrder }),
      });

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId 
            ? { ...card, columnId, order: newOrder } 
            : card
        ),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to move card');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      setIsLoading(true);
      await apiRequest(`${API_BASE}/cards/${cardId}`, {
        method: 'DELETE',
      });

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== cardId),
      }));

      // If we're viewing the deleted card, close the modal
      if (uiState.selectedCardId === cardId) {
        setUiState(prev => ({
          ...prev,
          selectedCardId: null,
        }));
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete card');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedCardId]);

  // Navigation functions
  const navigateToBoards = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      currentView: 'boards',
      selectedBoardId: null,
      selectedCardId: null,
    }));
  }, []);

  const navigateToBoard = useCallback(async (boardId: string) => {
    setUiState(prev => ({
      ...prev,
      currentView: 'board',
      selectedBoardId: boardId,
      selectedCardId: null,
    }));

    // Load board data
    try {
      await Promise.all([
        loadColumns(boardId),
        loadCards(boardId),
      ]);
    } catch (error) {
      setError('Failed to load board data');
    }
  }, [loadColumns, loadCards]);

  const selectCard = useCallback((cardId: string | null) => {
    setUiState(prev => ({
      ...prev,
      selectedCardId: cardId,
    }));
  }, []);

  // Load boards when user is authenticated
  useEffect(() => {
    if (appState.user && uiState.currentView === 'boards' && appState.boards.length === 0) {
      loadBoards();
    }
  }, [appState.user, uiState.currentView, appState.boards.length, loadBoards]);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,

    // User state
    user: appState.user,
    currentBoard: uiState.selectedBoardId ? getBoardById(uiState.selectedBoardId) : null,
    selectedCard: uiState.selectedCardId ? getCardById(uiState.selectedCardId) : null,
    selectedBoardId: uiState.selectedBoardId,
    boards: appState.boards,
    columns: appState.columns,
    cards: appState.cards,

    // Auth functions
    checkAuth,
    login,
    signUp,
    logout,
    setAuthMode,
    clearError,

    // UI functions
    setView,
    setCurrentView,
    selectBoard,
    setSelectedCardId,

    // Getter functions
    getBoardById,
    getColumnsByBoardId,
    getCardsByColumnId,
    getCardById,

    // Board functions
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,

    // Column functions
    loadColumns,
    addColumn,
    createColumn,
    updateColumn,
    deleteColumn,

    // Card functions
    loadCards,
    addCard,
    createCard,
    updateCard,
    moveCard,
    deleteCard,

    // Navigation functions
    navigateToBoards,
    navigateToBoard,
    selectCard,
  };
}

// Hook for board-specific data
export function useBoardData(boardId: string | null) {
  const { appState } = useTaskly();

  const board = boardId ? appState.boards.find(b => b.id === boardId) : null;
  
  const columns = appState.columns
    .filter(col => col.boardId === boardId)
    .sort((a, b) => a.order - b.order);
    
  const cards = appState.cards
    .filter(card => card.boardId === boardId && !card.isArchived)
    .sort((a, b) => a.order - b.order);

  const cardsByColumn = columns.reduce((acc, column) => {
    acc[column.id] = cards.filter(card => card.columnId === column.id);
    return acc;
  }, {} as Record<string, Card[]>);

  return {
    board,
    columns,
    cards,
    cardsByColumn,
  };
}

// Hook for card-specific data
export function useCardData(cardId: string | null) {
  const { appState } = useTaskly();
  const card = cardId ? appState.cards.find(c => c.id === cardId) : null;
  return { card };
}