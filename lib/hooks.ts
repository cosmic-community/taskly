'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { AppState, UIState, User, Board, Column, Card, LoginCredentials, SignUpCredentials, CreateBoardForm, CreateColumnForm, CreateCardForm, EditCardForm, ViewMode } from '@/types';
import { getUserBoards, createBoard as createBoardApi, updateBoard, deleteBoard, getBoardColumns, createColumn as createColumnApi, updateColumn, deleteColumn, getColumnCards, getBoardCards, createCard as createCardApi, updateCard, deleteCard } from '@/lib/cosmic';

// Define the complete context interface
interface TasklyContextType {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  
  // Computed properties
  user: User | null;
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  selectedBoard: Board | null;
  selectedCard: Card | undefined;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // UI methods
  setCurrentView: (view: ViewMode) => void;
  setView: (view: ViewMode, boardId?: string, cardId?: string) => void;
  setSelectedCard: (card: Card | undefined) => void;
  setSelectedCardId: (cardId: string | null) => void;
  
  // Data methods
  loadBoardData: (boardId: string) => Promise<void>;
  getBoardById: (boardId: string) => Board | undefined;
  getCardById: (cardId: string) => Card | undefined;
  getColumnsByBoardId: (boardId: string) => Column[];
  getCardsByColumnId: (columnId: string) => Card[];
  
  // CRUD operations
  createBoard: (form: CreateBoardForm) => Promise<void>;
  createColumn: (form: CreateColumnForm) => Promise<void>;
  addColumn: (boardId: string, title: string) => Promise<void>;
  createCard: (form: CreateCardForm) => Promise<void>;
  addCard: (columnId: string, title: string) => Promise<void>;
  editCard: (form: EditCardForm) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<void>;
}

// Initial state
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

// Actions
type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_BOARDS'; payload: Board[] }
  | { type: 'SET_COLUMNS'; payload: Column[] }
  | { type: 'SET_CARDS'; payload: Card[] }
  | { type: 'SET_CURRENT_VIEW'; payload: ViewMode }
  | { type: 'SET_SELECTED_BOARD'; payload: string | null }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_AUTH_MODE'; payload: 'login' | 'signup' }
  | { type: 'ADD_BOARD'; payload: Board }
  | { type: 'ADD_COLUMN'; payload: Column }
  | { type: 'ADD_CARD'; payload: Card }
  | { type: 'UPDATE_CARD'; payload: Card };

// Combined state
interface State {
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
}

const initialState: State = {
  appState: initialAppState,
  uiState: initialUIState,
  isLoading: false,
  error: null,
};

// Reducer
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER':
      return { ...state, appState: { ...state.appState, user: action.payload } };
    case 'SET_BOARDS':
      return { ...state, appState: { ...state.appState, boards: action.payload } };
    case 'SET_COLUMNS':
      return { ...state, appState: { ...state.appState, columns: action.payload } };
    case 'SET_CARDS':
      return { ...state, appState: { ...state.appState, cards: action.payload } };
    case 'SET_CURRENT_VIEW':
      return { ...state, uiState: { ...state.uiState, currentView: action.payload } };
    case 'SET_SELECTED_BOARD':
      return { ...state, uiState: { ...state.uiState, selectedBoardId: action.payload } };
    case 'SET_SELECTED_CARD':
      return { ...state, uiState: { ...state.uiState, selectedCardId: action.payload } };
    case 'SET_AUTH_MODE':
      return { ...state, uiState: { ...state.uiState, authMode: action.payload } };
    case 'ADD_BOARD':
      return { 
        ...state, 
        appState: { 
          ...state.appState, 
          boards: [...state.appState.boards, action.payload] 
        } 
      };
    case 'ADD_COLUMN':
      return { 
        ...state, 
        appState: { 
          ...state.appState, 
          columns: [...state.appState.columns, action.payload] 
        } 
      };
    case 'ADD_CARD':
      return { 
        ...state, 
        appState: { 
          ...state.appState, 
          cards: [...state.appState.cards, action.payload] 
        } 
      };
    case 'UPDATE_CARD':
      return { 
        ...state, 
        appState: { 
          ...state.appState, 
          cards: state.appState.cards.map(card => 
            card.id === action.payload.id ? action.payload : card
          ) 
        } 
      };
    default:
      return state;
  }
};

// Context
const TasklyContext = createContext<TasklyContextType | undefined>(undefined);

// Provider
export function TasklyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Auth functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

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
      dispatch({ type: 'SET_USER', payload: data.user });
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });

      // Load user's boards
      const boards = await getUserBoards(data.user.id);
      dispatch({ type: 'SET_BOARDS', payload: boards });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Login failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    if (credentials.password !== credentials.confirmPassword) {
      dispatch({ type: 'SET_ERROR', payload: 'Passwords do not match' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
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
      dispatch({ type: 'SET_USER', payload: data.user });
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });

      // Initialize empty boards
      dispatch({ type: 'SET_BOARDS', payload: [] });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Sign up failed' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly_token');
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_BOARDS', payload: [] });
    dispatch({ type: 'SET_COLUMNS', payload: [] });
    dispatch({ type: 'SET_CARDS', payload: [] });
    dispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    dispatch({ type: 'SET_SELECTED_BOARD', payload: null });
    dispatch({ type: 'SET_SELECTED_CARD', payload: null });
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('taskly_token');
    if (!token) {
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
      return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Token invalid');
      }

      const data = await response.json();
      dispatch({ type: 'SET_USER', payload: data.user });
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'boards' });

      // Load user's boards
      const boards = await getUserBoards(data.user.id);
      dispatch({ type: 'SET_BOARDS', payload: boards });
    } catch (error) {
      localStorage.removeItem('taskly_token');
      dispatch({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    }
  }, []);

  // UI functions
  const setCurrentView = useCallback((view: ViewMode) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
  }, []);

  const setView = useCallback((view: ViewMode, boardId?: string, cardId?: string) => {
    dispatch({ type: 'SET_CURRENT_VIEW', payload: view });
    if (boardId !== undefined) {
      dispatch({ type: 'SET_SELECTED_BOARD', payload: boardId });
    }
    if (cardId !== undefined) {
      dispatch({ type: 'SET_SELECTED_CARD', payload: cardId });
    }
  }, []);

  const setSelectedCard = useCallback((card: Card | undefined) => {
    dispatch({ type: 'SET_SELECTED_CARD', payload: card?.id || null });
  }, []);

  const setSelectedCardId = useCallback((cardId: string | null) => {
    dispatch({ type: 'SET_SELECTED_CARD', payload: cardId });
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    dispatch({ type: 'SET_AUTH_MODE', payload: mode });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  // Data loading functions
  const loadBoardData = useCallback(async (boardId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId),
      ]);

      dispatch({ type: 'SET_COLUMNS', payload: columns });
      dispatch({ type: 'SET_CARDS', payload: cards });
      dispatch({ type: 'SET_SELECTED_BOARD', payload: boardId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load board data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Helper functions
  const getBoardById = useCallback((boardId: string): Board | undefined => {
    return state.appState.boards.find(board => board.id === boardId);
  }, [state.appState.boards]);

  const getCardById = useCallback((cardId: string): Card | undefined => {
    return state.appState.cards.find(card => card.id === cardId);
  }, [state.appState.cards]);

  const getColumnsByBoardId = useCallback((boardId: string): Column[] => {
    return state.appState.columns
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }, [state.appState.columns]);

  const getCardsByColumnId = useCallback((columnId: string): Card[] => {
    return state.appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [state.appState.cards]);

  // CRUD operations
  const createBoard = useCallback(async (form: CreateBoardForm) => {
    if (!state.appState.user) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const board = await createBoardApi(
        form.title, 
        state.appState.user.id,
        state.appState.boards.length
      );
      dispatch({ type: 'ADD_BOARD', payload: board });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create board' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.appState.user, state.appState.boards.length]);

  const createColumn = useCallback(async (form: CreateColumnForm) => {
    if (!state.uiState.selectedBoardId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const boardColumns = getColumnsByBoardId(state.uiState.selectedBoardId);
      const column = await createColumnApi(
        state.uiState.selectedBoardId,
        form.title,
        boardColumns.length
      );
      dispatch({ type: 'ADD_COLUMN', payload: column });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create column' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.uiState.selectedBoardId, getColumnsByBoardId]);

  const addColumn = useCallback(async (boardId: string, title: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const boardColumns = getColumnsByBoardId(boardId);
      const column = await createColumnApi(boardId, title, boardColumns.length);
      dispatch({ type: 'ADD_COLUMN', payload: column });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create column' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getColumnsByBoardId]);

  const createCard = useCallback(async (form: CreateCardForm) => {
    // This would need columnId to be added to the form or managed differently
    // For now, using the selected board's first column
    const columns = getColumnsByBoardId(state.uiState.selectedBoardId || '');
    if (!columns.length || !state.uiState.selectedBoardId) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const columnCards = getCardsByColumnId(columns[0].id);
      const card = await createCardApi(
        state.uiState.selectedBoardId,
        columns[0].id,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        columnCards.length
      );
      dispatch({ type: 'ADD_CARD', payload: card });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create card' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.uiState.selectedBoardId, getColumnsByBoardId, getCardsByColumnId]);

  const addCard = useCallback(async (columnId: string, title: string) => {
    const column = state.appState.columns.find(col => col.id === columnId);
    if (!column) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const columnCards = getCardsByColumnId(columnId);
      const card = await createCardApi(
        column.boardId,
        columnId,
        title,
        '',
        [],
        '',
        columnCards.length
      );
      dispatch({ type: 'ADD_CARD', payload: card });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create card' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.appState.columns, getCardsByColumnId]);

  const editCard = useCallback(async (form: EditCardForm) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await updateCard(form.id, {
        title: form.title,
        description: form.description,
        labels: form.labels,
        dueDate: form.dueDate,
      });
      
      const updatedCard = { ...getCardById(form.id)!, ...form };
      dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update card' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getCardById]);

  const moveCard = useCallback(async (cardId: string, columnId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      await updateCard(cardId, { columnId });
      
      const card = getCardById(cardId);
      if (card) {
        const updatedCard = { ...card, columnId };
        dispatch({ type: 'UPDATE_CARD', payload: updatedCard });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to move card' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [getCardById]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Computed properties
  const selectedBoard = state.uiState.selectedBoardId 
    ? getBoardById(state.uiState.selectedBoardId) || null 
    : null;

  const selectedCard = state.uiState.selectedCardId 
    ? getCardById(state.uiState.selectedCardId) 
    : undefined;

  const contextValue: TasklyContextType = {
    // State
    appState: state.appState,
    uiState: state.uiState,
    isLoading: state.isLoading,
    error: state.error,
    
    // Computed properties
    user: state.appState.user,
    currentView: state.uiState.currentView,
    selectedBoardId: state.uiState.selectedBoardId,
    selectedCardId: state.uiState.selectedCardId,
    selectedBoard,
    selectedCard,
    boards: state.appState.boards,
    columns: state.appState.columns,
    cards: state.appState.cards,
    
    // Auth methods
    login,
    signUp,
    logout,
    checkAuth,
    setAuthMode,
    clearError,
    
    // UI methods
    setCurrentView,
    setView,
    setSelectedCard,
    setSelectedCardId,
    
    // Data methods
    loadBoardData,
    getBoardById,
    getCardById,
    getColumnsByBoardId,
    getCardsByColumnId,
    
    // CRUD operations
    createBoard,
    createColumn,
    addColumn,
    createCard,
    addCard,
    editCard,
    moveCard,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook
export function useTaskly(): TasklyContextType {
  const context = useContext(TasklyContext);
  if (context === undefined) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}