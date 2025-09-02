'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { User, Board, Column, Card, AppState, UIState, LoginCredentials, SignUpCredentials, AuthResponse } from '@/types';
import { 
  getUserBoards,
  createBoard as createBoardApi,
  updateBoard as updateBoardApi,
  deleteBoard as deleteBoardApi,
  getBoardColumns,
  createColumn as createColumnApi,
  updateColumn as updateColumnApi,
  deleteColumn as deleteColumnApi,
  getBoardCards,
  createCard as createCardApi,
  updateCard as updateCardApi,
  deleteCard as deleteCardApi
} from '@/lib/cosmic';

// Storage keys
const STORAGE_KEYS = {
  TOKEN: 'taskly_token',
  USER: 'taskly_user',
} as const;

// Initial states
const initialAppState: AppState = {
  boards: [],
  columns: [],
  cards: [],
  user: null,
};

const initialUIState: UIState = {
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

// Context interface
interface TasklyContextType {
  // App state
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;

  // Board methods
  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  selectBoard: (boardId: string) => void;
  
  // Column methods
  loadColumns: (boardId: string) => Promise<void>;
  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  
  // Card methods  
  loadCards: (boardId: string) => Promise<void>;
  createCard: (boardId: string, columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  selectCard: (cardId: string | null) => void;
  
  // Utility methods
  clearError: () => void;
  setView: (view: UIState['currentView']) => void;
}

// Create context
const TasklyContext = createContext<TasklyContextType | null>(null);

// Provider component
export function TasklyProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to handle API errors
  const handleApiError = useCallback((error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    const message = error?.response?.data?.error || error?.message || defaultMessage;
    setError(message);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auth methods
  const login = useCallback(async (credentials: LoginCredentials) => {
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

      const authResponse: AuthResponse = await response.json();
      
      // Store auth data
      localStorage.setItem(STORAGE_KEYS.TOKEN, authResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResponse.user));
      
      // Update app state
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadBoards();
    } catch (error) {
      handleApiError(error, 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    // Validate passwords match
    if (credentials.password !== credentials.confirmPassword) {
      setError('Passwords do not match');
      return;
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

      const authResponse: AuthResponse = await response.json();
      
      // Store auth data
      localStorage.setItem(STORAGE_KEYS.TOKEN, authResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResponse.user));
      
      // Update app state
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards (will be empty for new user)
      await loadBoards();
    } catch (error) {
      handleApiError(error, 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear storage
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    // Reset state
    setAppState(initialAppState);
    setUIState(initialUIState);
    setError(null);
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
    setError(null);
  }, []);

  // Board methods
  const loadBoards = useCallback(async () => {
    if (!appState.user) return;

    setIsLoading(true);
    try {
      const boards = await getUserBoards(appState.user.id);
      setAppState(prev => ({ ...prev, boards }));
    } catch (error) {
      handleApiError(error, 'Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, handleApiError]);

  const createBoard = useCallback(async (title: string) => {
    if (!appState.user) return;

    setIsLoading(true);
    try {
      const order = appState.boards.length;
      const board = await createBoardApi(title, appState.user.id, order);
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, board],
      }));
    } catch (error) {
      handleApiError(error, 'Failed to create board');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, appState.boards.length, handleApiError]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => {
    setIsLoading(true);
    try {
      await updateBoardApi(id, updates);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board => 
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to update board');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const deleteBoard = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await deleteBoardApi(id);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));
      
      // If this was the selected board, go back to boards view
      if (uiState.selectedBoardId === id) {
        setUIState(prev => ({
          ...prev,
          currentView: 'boards',
          selectedBoardId: null,
          selectedCardId: null,
        }));
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete board');
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedBoardId, handleApiError]);

  const selectBoard = useCallback((boardId: string) => {
    setUIState(prev => ({
      ...prev,
      currentView: 'board',
      selectedBoardId: boardId,
      selectedCardId: null,
    }));
  }, []);

  // Column methods
  const loadColumns = useCallback(async (boardId: string) => {
    setIsLoading(true);
    try {
      const columns = await getBoardColumns(boardId);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(col => col.boardId !== boardId).concat(columns),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to load columns');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    setIsLoading(true);
    try {
      const boardColumns = appState.columns.filter(col => col.boardId === boardId);
      const order = boardColumns.length;
      const column = await createColumnApi(boardId, title, order);
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, column],
      }));
    } catch (error) {
      handleApiError(error, 'Failed to create column');
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns, handleApiError]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => {
    setIsLoading(true);
    try {
      await updateColumnApi(id, updates);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => 
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to update column');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const deleteColumn = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await deleteColumnApi(id);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to delete column');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  // Card methods
  const loadCards = useCallback(async (boardId: string) => {
    setIsLoading(true);
    try {
      const cards = await getBoardCards(boardId);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.boardId !== boardId).concat(cards),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to load cards');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const createCard = useCallback(async (boardId: string, columnId: string, title: string, description?: string) => {
    setIsLoading(true);
    try {
      const columnCards = appState.cards.filter(card => card.columnId === columnId);
      const order = columnCards.length;
      const card = await createCardApi(boardId, columnId, title, description, undefined, undefined, order);
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, card],
      }));
    } catch (error) {
      handleApiError(error, 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  }, [appState.cards, handleApiError]);

  const updateCard = useCallback(async (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => {
    setIsLoading(true);
    try {
      await updateCardApi(id, updates);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      handleApiError(error, 'Failed to update card');
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError]);

  const deleteCard = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await deleteCardApi(id);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
      
      // If this was the selected card, clear selection
      if (uiState.selectedCardId === id) {
        setUIState(prev => ({ ...prev, selectedCardId: null }));
      }
    } catch (error) {
      handleApiError(error, 'Failed to delete card');
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedCardId, handleApiError]);

  const selectCard = useCallback((cardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: cardId }));
  }, []);

  // Utility methods
  const setView = useCallback((view: UIState['currentView']) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const userStr = localStorage.getItem(STORAGE_KEYS.USER);
      
      if (token && userStr) {
        try {
          // Verify token is still valid
          const response = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            const { user } = await response.json();
            setAppState(prev => ({ ...prev, user }));
            setUIState(prev => ({ ...prev, currentView: 'boards' }));
            return;
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
        }
        
        // Clear invalid auth data
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
      }
      
      // Not authenticated, show auth panel
      setUIState(prev => ({ ...prev, currentView: 'auth' }));
    };

    initializeAuth();
  }, []);

  // Load boards when user changes
  useEffect(() => {
    if (appState.user && uiState.currentView === 'boards') {
      loadBoards();
    }
  }, [appState.user, uiState.currentView, loadBoards]);

  // Load columns and cards when board is selected
  useEffect(() => {
    if (uiState.selectedBoardId && uiState.currentView === 'board') {
      loadColumns(uiState.selectedBoardId);
      loadCards(uiState.selectedBoardId);
    }
  }, [uiState.selectedBoardId, uiState.currentView, loadColumns, loadCards]);

  const contextValue: TasklyContextType = {
    appState,
    uiState,
    isLoading,
    error,
    login,
    signUp,
    logout,
    setAuthMode,
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    selectBoard,
    loadColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    loadCards,
    createCard,
    updateCard,
    deleteCard,
    selectCard,
    clearError,
    setView,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook to use the context
export function useTaskly() {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}