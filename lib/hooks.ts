'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { AppState, UIState, ViewMode, User, Board, Column, Card, LoginCredentials, SignUpCredentials, CreateBoardForm, CreateColumnForm, CreateCardForm, EditCardForm } from '@/types';
import { 
  getUserBoards, 
  getBoardColumns, 
  getColumnCards, 
  getBoardCards,
  createBoard as createBoardApi,
  createColumn as createColumnApi,
  createCard as createCardApi,
  updateBoard as updateBoardApi,
  updateColumn as updateColumnApi,
  updateCard as updateCardApi,
  deleteBoard as deleteBoardApi,
  deleteColumn as deleteColumnApi,
  deleteCard as deleteCardApi
} from '@/lib/cosmic';

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

// Context type definition
interface TasklyContextType {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  
  // UI methods
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setView: (view: ViewMode) => void;
  clearError: () => void;
  
  // Data access methods
  user: User | null;
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  getBoardById: (id: string) => Board | undefined;
  getColumnsByBoardId: (boardId: string) => Column[];
  getCardsByColumnId: (columnId: string) => Card[];
  getCardById: (id: string) => Card | undefined;
  
  // CRUD operations
  createBoard: (form: CreateBoardForm) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addColumn: (boardId: string, form: CreateColumnForm) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  addCard: (columnId: string, form: CreateCardForm) => Promise<void>;
  updateCard: (id: string, updates: Partial<EditCardForm>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  
  // Data loading
  loadBoardData: (boardId: string) => Promise<void>;
  loadUserBoards: () => Promise<void>;
}

// Action types
type AppAction = 
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_BOARDS'; payload: Board[] }
  | { type: 'SET_COLUMNS'; payload: Column[] }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'ADD_BOARD'; payload: Board }
  | { type: 'UPDATE_BOARD'; payload: { id: string; updates: Partial<Board> } }
  | { type: 'DELETE_BOARD'; payload: string }
  | { type: 'ADD_COLUMN'; payload: Column }
  | { type: 'UPDATE_COLUMN'; payload: { id: string; updates: Partial<Column> } }
  | { type: 'DELETE_COLUMN'; payload: string }
  | { type: 'ADD_CARD'; payload: Card }
  | { type: 'UPDATE_CARD'; payload: { id: string; updates: Partial<Card> } }
  | { type: 'DELETE_CARD'; payload: string };

type UIAction =
  | { type: 'SET_CURRENT_VIEW'; payload: ViewMode }
  | { type: 'SET_SELECTED_BOARD'; payload: string | null }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_AUTH_MODE'; payload: 'login' | 'signup' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

// Reducers
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_BOARDS':
      return { ...state, boards: action.payload };
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'ADD_BOARD':
      return { ...state, boards: [...state.boards, action.payload] };
    case 'UPDATE_BOARD':
      return {
        ...state,
        boards: state.boards.map(board =>
          board.id === action.payload.id ? { ...board, ...action.payload.updates } : board
        ),
      };
    case 'DELETE_BOARD':
      return {
        ...state,
        boards: state.boards.filter(board => board.id !== action.payload),
      };
    case 'ADD_COLUMN':
      return { ...state, columns: [...state.columns, action.payload] };
    case 'UPDATE_COLUMN':
      return {
        ...state,
        columns: state.columns.map(column =>
          column.id === action.payload.id ? { ...column, ...action.payload.updates } : column
        ),
      };
    case 'DELETE_COLUMN':
      return {
        ...state,
        columns: state.columns.filter(column => column.id !== action.payload),
      };
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? { ...card, ...action.payload.updates } : card
        ),
      };
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload),
      };
    default:
      return state;
  }
}

function uiReducer(state: UIState & { isLoading: boolean; error: string | null }, action: UIAction): UIState & { isLoading: boolean; error: string | null } {
  switch (action.type) {
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SELECTED_BOARD':
      return { ...state, selectedBoardId: action.payload };
    case 'SET_SELECTED_CARD':
      return { ...state, selectedCardId: action.payload };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

// Context creation
const TasklyContext = createContext<TasklyContextType | null>(null);

// Provider component
export function TasklyProvider({ children }: { children: ReactNode }) {
  const [appState, appDispatch] = useReducer(appReducer, initialAppState);
  const [uiState, uiDispatch] = useReducer(uiReducer, { 
    ...initialUIState, 
    isLoading: false, 
    error: null 
  });

  // Auth methods
  const login = useCallback(async (credentials: LoginCredentials) => {
    uiDispatch({ type: 'SET_LOADING', payload: true });
    uiDispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store token
      localStorage.setItem('taskly_token', data.token);
      
      // Set user
      appDispatch({ type: 'SET_USER', payload: data.user });
      uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
      
      // Load user data
      await loadUserBoards();
    } catch (error) {
      uiDispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
    } finally {
      uiDispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    uiDispatch({ type: 'SET_LOADING', payload: true });
    uiDispatch({ type: 'SET_ERROR', payload: null });
    
    try {
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }
      
      // Store token
      localStorage.setItem('taskly_token', data.token);
      
      // Set user
      appDispatch({ type: 'SET_USER', payload: data.user });
      uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
      
      // Load user data (will be empty for new users)
      await loadUserBoards();
    } catch (error) {
      uiDispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Sign up failed' });
    } finally {
      uiDispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly_token');
    appDispatch({ type: 'SET_USER', payload: null });
    appDispatch({ type: 'SET_BOARDS', payload: [] });
    appDispatch({ type: 'SET_COLUMNS', payload: [] });
    appDispatch({ type: 'SET_CARDS', payload: [] });
    uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    uiDispatch({ type: 'SET_SELECTED_BOARD', payload: null });
    uiDispatch({ type: 'SET_SELECTED_CARD', payload: null });
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('taskly_token');
    if (!token) {
      uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Token invalid');
      }
      
      const data = await response.json();
      appDispatch({ type: 'SET_USER', payload: data.user });
      uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
      
      await loadUserBoards();
    } catch (error) {
      localStorage.removeItem('taskly_token');
      uiDispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    }
  }, []);

  // UI methods
  const setCurrentView = useCallback((view: ViewMode) => {
    uiDispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const setSelectedBoardId = useCallback((id: string | null) => {
    uiDispatch({ type: 'SET_SELECTED_BOARD', payload: id });
  }, []);

  const setSelectedCardId = useCallback((id: string | null) => {
    uiDispatch({ type: 'SET_SELECTED_CARD', payload: id });
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    uiDispatch({ type: 'SET_AUTH_MODE', payload: mode });
  }, []);

  const setView = useCallback((view: ViewMode) => {
    uiDispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const clearError = useCallback(() => {
    uiDispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Data loading methods
  const loadUserBoards = useCallback(async () => {
    if (!appState.user) return;
    
    try {
      const boards = await getUserBoards(appState.user.id);
      appDispatch({ type: 'SET_BOARDS', payload: boards });
    } catch (error) {
      console.error('Failed to load user boards:', error);
    }
  }, [appState.user]);

  const loadBoardData = useCallback(async (boardId: string) => {
    try {
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId),
      ]);
      
      appDispatch({ type: 'SET_COLUMNS', payload: columns });
      appDispatch({ type: 'SET_CARDS', payload: cards });
    } catch (error) {
      console.error('Failed to load board data:', error);
    }
  }, []);

  // Data access methods
  const getBoardById = useCallback((id: string) => {
    return appState.boards.find(board => board.id === id);
  }, [appState.boards]);

  const getColumnsByBoardId = useCallback((boardId: string) => {
    return appState.columns.filter(column => column.boardId === boardId);
  }, [appState.columns]);

  const getCardsByColumnId = useCallback((columnId: string) => {
    return appState.cards.filter(card => card.columnId === columnId);
  }, [appState.cards]);

  const getCardById = useCallback((id: string) => {
    return appState.cards.find(card => card.id === id);
  }, [appState.cards]);

  // CRUD operations
  const createBoard = useCallback(async (form: CreateBoardForm) => {
    if (!appState.user) throw new Error('User not authenticated');
    
    try {
      const newBoard = await createBoardApi(form.title, appState.user.id, appState.boards.length);
      appDispatch({ type: 'ADD_BOARD', payload: newBoard });
    } catch (error) {
      console.error('Failed to create board:', error);
      throw error;
    }
  }, [appState.user, appState.boards.length]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      await updateBoardApi(id, updates);
      appDispatch({ type: 'UPDATE_BOARD', payload: { id, updates } });
    } catch (error) {
      console.error('Failed to update board:', error);
      throw error;
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      await deleteBoardApi(id);
      appDispatch({ type: 'DELETE_BOARD', payload: id });
    } catch (error) {
      console.error('Failed to delete board:', error);
      throw error;
    }
  }, []);

  const addColumn = useCallback(async (boardId: string, form: CreateColumnForm) => {
    try {
      const columns = getColumnsByBoardId(boardId);
      const newColumn = await createColumnApi(boardId, form.title, columns.length);
      appDispatch({ type: 'ADD_COLUMN', payload: newColumn });
    } catch (error) {
      console.error('Failed to create column:', error);
      throw error;
    }
  }, [getColumnsByBoardId]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    try {
      await updateColumnApi(id, updates);
      appDispatch({ type: 'UPDATE_COLUMN', payload: { id, updates } });
    } catch (error) {
      console.error('Failed to update column:', error);
      throw error;
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      await deleteColumnApi(id);
      appDispatch({ type: 'DELETE_COLUMN', payload: id });
    } catch (error) {
      console.error('Failed to delete column:', error);
      throw error;
    }
  }, []);

  const addCard = useCallback(async (columnId: string, form: CreateCardForm) => {
    try {
      const column = appState.columns.find(col => col.id === columnId);
      if (!column) throw new Error('Column not found');
      
      const cards = getCardsByColumnId(columnId);
      const newCard = await createCardApi(
        column.boardId,
        columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        cards.length
      );
      appDispatch({ type: 'ADD_CARD', payload: newCard });
    } catch (error) {
      console.error('Failed to create card:', error);
      throw error;
    }
  }, [appState.columns, getCardsByColumnId]);

  const updateCard = useCallback(async (id: string, updates: Partial<EditCardForm>) => {
    try {
      await updateCardApi(id, updates);
      appDispatch({ type: 'UPDATE_CARD', payload: { id, updates } });
    } catch (error) {
      console.error('Failed to update card:', error);
      throw error;
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      await deleteCardApi(id);
      appDispatch({ type: 'DELETE_CARD', payload: id });
    } catch (error) {
      console.error('Failed to delete card:', error);
      throw error;
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const contextValue: TasklyContextType = {
    // State
    appState,
    uiState,
    isLoading: uiState.isLoading,
    error: uiState.error,
    
    // Auth methods
    login,
    signUp,
    logout,
    checkAuth,
    
    // UI methods
    setCurrentView,
    setSelectedBoardId,
    setSelectedCardId,
    setAuthMode,
    setView,
    clearError,
    
    // Data access properties
    user: appState.user,
    currentView: uiState.currentView,
    selectedBoardId: uiState.selectedBoardId,
    selectedCardId: uiState.selectedCardId,
    boards: appState.boards,
    columns: appState.columns,
    cards: appState.cards,
    
    // Data access methods
    getBoardById,
    getColumnsByBoardId,
    getCardsByColumnId,
    getCardById,
    
    // CRUD operations
    createBoard,
    updateBoard,
    deleteBoard,
    addColumn,
    updateColumn,
    deleteColumn,
    addCard,
    updateCard,
    deleteCard,
    
    // Data loading
    loadBoardData,
    loadUserBoards,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook to use the Taskly context
export function useTaskly(): TasklyContextType {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}