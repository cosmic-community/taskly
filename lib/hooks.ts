'use client';

import { createContext, useContext, useCallback, useReducer, useEffect, ReactNode } from 'react';
import { AppState, UIState, Board, Column, Card, User, ViewMode, CreateBoardForm, CreateColumnForm, CreateCardForm, EditCardForm, LoginCredentials, SignUpCredentials, AuthResponse } from '@/types';
import * as cosmic from '@/lib/cosmic';

// Initial states
const initialAppState: AppState = {
  boards: [],
  columns: [],
  cards: [],
  user: null,
};

const initialUIState: UIState = {
  currentView: 'auth' as ViewMode,
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

// Action types
type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_BOARDS'; payload: Board[] }
  | { type: 'ADD_BOARD'; payload: Board }
  | { type: 'UPDATE_BOARD'; payload: { id: string; updates: Partial<Board> } }
  | { type: 'DELETE_BOARD'; payload: string }
  | { type: 'SET_COLUMNS'; payload: Column[] }
  | { type: 'ADD_COLUMN'; payload: Column }
  | { type: 'UPDATE_COLUMN'; payload: { id: string; updates: Partial<Column> } }
  | { type: 'DELETE_COLUMN'; payload: string }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'ADD_CARD'; payload: Card }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<Card> } }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'RESET_STATE' };

type UIAction = 
  | { type: 'SET_CURRENT_VIEW'; payload: ViewMode }
  | { type: 'SET_SELECTED_BOARD'; payload: string | null }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_AUTH_MODE'; payload: 'login' | 'signup' }
  | { type: 'RESET_UI_STATE' };

// Reducers
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_BOARDS':
      return { ...state, boards: action.payload };
    case 'ADD_BOARD':
      return { ...state, boards: [...state.boards, action.payload] };
    case 'UPDATE_BOARD':
      return {
        ...state,
        boards: state.boards.map(board =>
          board.id === action.payload.id ? { ...board, ...action.payload.updates } : board
        )
      };
    case 'DELETE_BOARD':
      return {
        ...state,
        boards: state.boards.filter(board => board.id !== action.payload)
      };
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };
    case 'ADD_COLUMN':
      return { ...state, columns: [...state.columns, action.payload] };
    case 'UPDATE_COLUMN':
      return {
        ...state,
        columns: state.columns.map(column =>
          column.id === action.payload.id ? { ...column, ...action.payload.updates } : column
        )
      };
    case 'DELETE_COLUMN':
      return {
        ...state,
        columns: state.columns.filter(column => column.id !== action.payload)
      };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? { ...card, ...action.payload.updates } : card
        )
      };
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload)
      };
    case 'RESET_STATE':
      return initialAppState;
    default:
      return state;
  }
};

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SELECTED_BOARD':
      return { ...state, selectedBoardId: action.payload };
    case 'SET_SELECTED_CARD':
      return { ...state, selectedCardId: action.payload };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.payload };
    case 'RESET_UI_STATE':
      return initialUIState;
    default:
      return state;
  }
};

// Context interface
interface TasklyContextValue {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  
  // Computed values
  user: User | null;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  selectedBoard: Board | undefined;
  selectedCard: Card | undefined;

  // Auth methods
  checkAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;

  // UI methods
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoard: (boardId: string | null) => void;
  setSelectedCard: (cardId: string | null) => void;
  setView: (view: ViewMode) => void;

  // Data methods
  loadBoards: () => Promise<void>;
  loadBoardData: (boardId: string) => Promise<void>;
  getBoardById: (id: string) => Board | undefined;
  getColumnsByBoardId: (boardId: string) => Column[];
  getCardsByColumnId: (columnId: string) => Card[];
  getCardById: (id: string) => Card | undefined;

  // CRUD methods
  createBoard: (form: CreateBoardForm) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addColumn: (boardId: string, form: CreateColumnForm) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  addCard: (columnId: string, form: CreateCardForm) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, newColumnId: string, newOrder: number) => Promise<void>;

  // Utility methods
  clearError: () => void;
}

// Create context
const TasklyContext = createContext<TasklyContextValue | null>(null);

// Auth utilities
const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('taskly_token');
};

const setStoredToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('taskly_token', token);
};

const removeStoredToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('taskly_token');
};

// Provider component
interface TasklyProviderProps {
  children: ReactNode;
}

export function TasklyProvider({ children }: TasklyProviderProps) {
  const [appState, dispatchApp] = useReducer(appReducer, initialAppState);
  const [uiState, dispatchUI] = useReducer(uiReducer, initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed values
  const selectedBoard = appState.boards.find(board => board.id === uiState.selectedBoardId);
  const selectedCard = appState.cards.find(card => card.id === uiState.selectedCardId);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleError = useCallback((error: any) => {
    console.error('Taskly error:', error);
    setError(error.message || 'An unexpected error occurred');
  }, []);

  // Auth methods
  const checkAuth = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { user } = await response.json();
        dispatchApp({ type: 'SET_USER', payload: user });
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
      } else {
        removeStoredToken();
        dispatchApp({ type: 'RESET_STATE' });
        dispatchUI({ type: 'RESET_UI_STATE' });
      }
    } catch (error) {
      handleError(error);
      removeStoredToken();
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      clearError();

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      const authResponse: AuthResponse = await response.json();
      setStoredToken(authResponse.token);
      dispatchApp({ type: 'SET_USER', payload: authResponse.user });
      dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      clearError();

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

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }

      const authResponse: AuthResponse = await response.json();
      setStoredToken(authResponse.token);
      dispatchApp({ type: 'SET_USER', payload: authResponse.user });
      dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [handleError, clearError]);

  const logout = useCallback(() => {
    removeStoredToken();
    dispatchApp({ type: 'RESET_STATE' });
    dispatchUI({ type: 'RESET_UI_STATE' });
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    dispatchUI({ type: 'SET_AUTH_MODE', payload: mode });
  }, []);

  // UI methods
  const setCurrentView = useCallback((view: ViewMode) => {
    dispatchUI({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const setSelectedBoard = useCallback((boardId: string | null) => {
    dispatchUI({ type: 'SET_SELECTED_BOARD', payload: boardId });
  }, []);

  const setSelectedCard = useCallback((cardId: string | null) => {
    dispatchUI({ type: 'SET_SELECTED_CARD', payload: cardId });
  }, []);

  const setView = useCallback((view: ViewMode) => {
    setCurrentView(view);
  }, [setCurrentView]);

  // Data loading methods
  const loadBoards = useCallback(async () => {
    if (!appState.user) return;

    try {
      setIsLoading(true);
      const boards = await cosmic.getUserBoards(appState.user.id);
      dispatchApp({ type: 'SET_BOARDS', payload: boards });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, handleError]);

  const loadBoardData = useCallback(async (boardId: string) => {
    try {
      setIsLoading(true);
      const [columns, cards] = await Promise.all([
        cosmic.getBoardColumns(boardId),
        cosmic.getBoardCards(boardId),
      ]);
      dispatchApp({ type: 'SET_COLUMNS', payload: columns });
      dispatchApp({ type: 'SET_CARDS', payload: cards });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Helper methods
  const getBoardById = useCallback((id: string): Board | undefined => {
    return appState.boards.find(board => board.id === id);
  }, [appState.boards]);

  const getColumnsByBoardId = useCallback((boardId: string): Column[] => {
    return appState.columns
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns]);

  const getCardsByColumnId = useCallback((columnId: string): Card[] => {
    return appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  const getCardById = useCallback((id: string): Card | undefined => {
    return appState.cards.find(card => card.id === id);
  }, [appState.cards]);

  // CRUD operations
  const createBoard = useCallback(async (form: CreateBoardForm) => {
    if (!appState.user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      const maxOrder = Math.max(-1, ...appState.boards.map(b => b.order));
      const board = await cosmic.createBoard(form.title, appState.user.id, maxOrder + 1);
      dispatchApp({ type: 'ADD_BOARD', payload: board });
    } catch (error) {
      handleError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, appState.boards, handleError]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      setIsLoading(true);
      await cosmic.updateBoard(id, updates);
      dispatchApp({ type: 'UPDATE_BOARD', payload: { id, updates } });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await cosmic.deleteBoard(id);
      dispatchApp({ type: 'DELETE_BOARD', payload: id });
      
      // Clear selection if this board was selected
      if (uiState.selectedBoardId === id) {
        dispatchUI({ type: 'SET_SELECTED_BOARD', payload: null });
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedBoardId, handleError]);

  const addColumn = useCallback(async (boardId: string, form: CreateColumnForm) => {
    try {
      setIsLoading(true);
      const boardColumns = getColumnsByBoardId(boardId);
      const maxOrder = Math.max(-1, ...boardColumns.map(c => c.order));
      const column = await cosmic.createColumn(boardId, form.title, maxOrder + 1);
      dispatchApp({ type: 'ADD_COLUMN', payload: column });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [getColumnsByBoardId, handleError]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    try {
      setIsLoading(true);
      await cosmic.updateColumn(id, updates);
      dispatchApp({ type: 'UPDATE_COLUMN', payload: { id, updates } });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await cosmic.deleteColumn(id);
      dispatchApp({ type: 'DELETE_COLUMN', payload: id });
      
      // Also delete all cards in this column
      const columnCards = appState.cards.filter(card => card.columnId === id);
      for (const card of columnCards) {
        dispatchApp({ type: 'DELETE_CARD', payload: card.id });
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [appState.cards, handleError]);

  const addCard = useCallback(async (columnId: string, form: CreateCardForm) => {
    const column = appState.columns.find(c => c.id === columnId);
    if (!column) throw new Error('Column not found');

    try {
      setIsLoading(true);
      const columnCards = getCardsByColumnId(columnId);
      const maxOrder = Math.max(-1, ...columnCards.map(c => c.order));
      const card = await cosmic.createCard(
        column.boardId,
        columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        maxOrder + 1
      );
      dispatchApp({ type: 'ADD_CARD', payload: card });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns, getCardsByColumnId, handleError]);

  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    try {
      setIsLoading(true);
      await cosmic.updateCard(id, updates);
      dispatchApp({ type: 'UPDATE_CARD', payload: { id, updates } });
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteCard = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      await cosmic.deleteCard(id);
      dispatchApp({ type: 'DELETE_CARD', payload: id });
      
      // Clear selection if this card was selected
      if (uiState.selectedCardId === id) {
        dispatchUI({ type: 'SET_SELECTED_CARD', payload: null });
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedCardId, handleError]);

  const moveCard = useCallback(async (cardId: string, newColumnId: string, newOrder: number) => {
    try {
      setIsLoading(true);
      await cosmic.updateCard(cardId, { columnId: newColumnId, order: newOrder });
      dispatchApp({ type: 'UPDATE_CARD', payload: { 
        id: cardId, 
        updates: { columnId: newColumnId, order: newOrder } 
      }});
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Initialize auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load boards when user changes
  useEffect(() => {
    if (appState.user && uiState.currentView === 'boards') {
      loadBoards();
    }
  }, [appState.user, uiState.currentView, loadBoards]);

  const contextValue: TasklyContextValue = {
    // State
    appState,
    uiState,
    isLoading,
    error,

    // Computed values
    user: appState.user,
    boards: appState.boards,
    columns: appState.columns,
    cards: appState.cards,
    currentView: uiState.currentView,
    selectedBoardId: uiState.selectedBoardId,
    selectedCardId: uiState.selectedCardId,
    selectedBoard,
    selectedCard,

    // Auth methods
    checkAuth,
    login,
    signUp,
    logout,
    setAuthMode,

    // UI methods
    setCurrentView,
    setSelectedBoard,
    setSelectedCard,
    setView,

    // Data methods
    loadBoards,
    loadBoardData,
    getBoardById,
    getColumnsByBoardId,
    getCardsByColumnId,
    getCardById,

    // CRUD methods
    createBoard,
    updateBoard,
    deleteBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,

    // Utility methods
    clearError,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook to use the context
export function useTaskly(): TasklyContextValue {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}

// Export the provider component as default
export { TasklyProvider as default };