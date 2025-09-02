'use client';

import { createContext, useContext, useReducer, useCallback, useEffect, ReactNode } from 'react';
import { 
  AppState, 
  User, 
  Board, 
  Column, 
  Card, 
  ViewMode, 
  UIState,
  LoginCredentials, 
  SignUpCredentials,
  DragEndEvent,
  CardDragData,
  ColumnDragData 
} from '@/types';
import { 
  getUserBoards,
  getBoardColumns, 
  getBoardCards,
  createBoard as createBoardAPI,
  createColumn as createColumnAPI,
  createCard as createCardAPI,
  updateBoard as updateBoardAPI,
  updateColumn as updateColumnAPI,
  updateCard as updateCardAPI,
  deleteBoard as deleteBoardAPI,
  deleteColumn as deleteColumnAPI,
  deleteCard as deleteCardAPI
} from '@/lib/cosmic';

// App state reducer
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
  | { type: 'MOVE_CARD'; payload: { cardId: string; columnId: string } };

// UI state reducer
type UIAction =
  | { type: 'SET_VIEW'; payload: ViewMode }
  | { type: 'SET_SELECTED_BOARD'; payload: string | null }
  | { type: 'SET_SELECTED_CARD'; payload: string | null }
  | { type: 'SET_AUTH_MODE'; payload: 'login' | 'signup' };

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
    case 'MOVE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.cardId 
            ? { ...card, columnId: action.payload.columnId }
            : card
        )
      };
    default:
      return state;
  }
};

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SELECTED_BOARD':
      return { ...state, selectedBoardId: action.payload };
    case 'SET_SELECTED_CARD':
      return { ...state, selectedCardId: action.payload };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.payload };
    default:
      return state;
  }
};

// Context interface
interface TasklyContextType {
  // App state
  user: User | null;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  
  // UI state
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  uiState: UIState;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  
  // UI methods
  setView: (view: ViewMode) => void;
  setSelectedBoard: (boardId: string | null) => void;
  setSelectedCard: (cardId: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Data loading methods
  loadBoardData: (boardId: string) => Promise<void>;
  
  // Board methods
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  // Column methods
  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
  
  // Card methods
  createCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<void>;
  
  // Drag and drop
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

const TasklyContext = createContext<TasklyContextType | null>(null);

// Initial states
const initialAppState: AppState = {
  user: null,
  boards: [],
  columns: [],
  cards: [],
};

const initialUIState: UIState = {
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

export function TasklyProvider({ children }: { children: ReactNode }) {
  const [appState, appDispatch] = useReducer(appReducer, initialAppState);
  const [uiState, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Helper function to handle errors
  const handleError = useCallback((error: unknown, fallbackMessage: string) => {
    console.error(fallbackMessage, error);
    if (error instanceof Error) {
      setError(error.message);
    } else if (typeof error === 'string') {
      setError(error);
    } else {
      setError(fallbackMessage);
    }
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
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      // Store token
      localStorage.setItem('taskly_token', data.token);
      
      // Update app state
      appDispatch({ type: 'SET_USER', payload: data.user });
      uiDispatch({ type: 'SET_VIEW', payload: 'boards' });
      
      // Load user's boards
      const boards = await getUserBoards(data.user.id);
      appDispatch({ type: 'SET_BOARDS', payload: boards });
      
    } catch (error) {
      handleError(error, 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate passwords match
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
      
      // Update app state
      appDispatch({ type: 'SET_USER', payload: data.user });
      uiDispatch({ type: 'SET_VIEW', payload: 'boards' });
      
      // Initialize with empty boards (new user)
      appDispatch({ type: 'SET_BOARDS', payload: [] });
      
    } catch (error) {
      handleError(error, 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly_token');
    appDispatch({ type: 'SET_USER', payload: null });
    appDispatch({ type: 'SET_BOARDS', payload: [] });
    appDispatch({ type: 'SET_COLUMNS', payload: [] });
    appDispatch({ type: 'SET_CARDS', payload: [] });
    uiDispatch({ type: 'SET_VIEW', payload: 'auth' });
    uiDispatch({ type: 'SET_SELECTED_BOARD', payload: null });
    uiDispatch({ type: 'SET_SELECTED_CARD', payload: null });
    setError(null);
  }, []);

  // UI methods
  const setView = useCallback((view: ViewMode) => {
    uiDispatch({ type: 'SET_VIEW', payload: view });
  }, []);

  const setSelectedBoard = useCallback((boardId: string | null) => {
    uiDispatch({ type: 'SET_SELECTED_BOARD', payload: boardId });
  }, []);

  const setSelectedCard = useCallback((cardId: string | null) => {
    uiDispatch({ type: 'SET_SELECTED_CARD', payload: cardId });
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    uiDispatch({ type: 'SET_AUTH_MODE', payload: mode });
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Data loading methods
  const loadBoardData = useCallback(async (boardId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId)
      ]);
      
      appDispatch({ type: 'SET_COLUMNS', payload: columns });
      appDispatch({ type: 'SET_CARDS', payload: cards });
      
    } catch (error) {
      handleError(error, 'Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Board methods
  const createBoard = useCallback(async (title: string) => {
    if (!appState.user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const order = Math.max(...appState.boards.map(b => b.order), 0) + 1;
      const board = await createBoardAPI(title, appState.user.id, order);
      appDispatch({ type: 'ADD_BOARD', payload: board });
    } catch (error) {
      handleError(error, 'Failed to create board');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, appState.boards, handleError]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateBoardAPI(id, updates);
      appDispatch({ type: 'UPDATE_BOARD', payload: { id, updates } });
    } catch (error) {
      handleError(error, 'Failed to update board');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteBoard = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteBoardAPI(id);
      appDispatch({ type: 'DELETE_BOARD', payload: id });
      
      // Clear selection if deleted board was selected
      if (uiState.selectedBoardId === id) {
        uiDispatch({ type: 'SET_SELECTED_BOARD', payload: null });
        uiDispatch({ type: 'SET_VIEW', payload: 'boards' });
      }
    } catch (error) {
      handleError(error, 'Failed to delete board');
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedBoardId, handleError]);

  // Column methods
  const createColumn = useCallback(async (boardId: string, title: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const boardColumns = appState.columns.filter(c => c.boardId === boardId);
      const order = Math.max(...boardColumns.map(c => c.order), 0) + 1;
      const column = await createColumnAPI(boardId, title, order);
      appDispatch({ type: 'ADD_COLUMN', payload: column });
    } catch (error) {
      handleError(error, 'Failed to create column');
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns, handleError]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateColumnAPI(id, updates);
      appDispatch({ type: 'UPDATE_COLUMN', payload: { id, updates } });
    } catch (error) {
      handleError(error, 'Failed to update column');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteColumn = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteColumnAPI(id);
      appDispatch({ type: 'DELETE_COLUMN', payload: id });
      
      // Also delete all cards in this column
      const columnCards = appState.cards.filter(card => card.columnId === id);
      for (const card of columnCards) {
        appDispatch({ type: 'DELETE_CARD', payload: card.id });
      }
    } catch (error) {
      handleError(error, 'Failed to delete column');
    } finally {
      setIsLoading(false);
    }
  }, [appState.cards, handleError]);

  const reorderColumns = useCallback(async (boardId: string, columnIds: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update order for each column
      const updates = columnIds.map((id, index) => ({ id, order: index }));
      
      for (const { id, order } of updates) {
        await updateColumnAPI(id, { order });
        appDispatch({ type: 'UPDATE_COLUMN', payload: { id, updates: { order } } });
      }
    } catch (error) {
      handleError(error, 'Failed to reorder columns');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Card methods
  const createCard = useCallback(async (columnId: string, title: string, description?: string) => {
    if (!uiState.selectedBoardId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const columnCards = appState.cards.filter(c => c.columnId === columnId);
      const order = Math.max(...columnCards.map(c => c.order), 0) + 1;
      const card = await createCardAPI(uiState.selectedBoardId, columnId, title, description, undefined, undefined, order);
      appDispatch({ type: 'ADD_CARD', payload: card });
    } catch (error) {
      handleError(error, 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  }, [uiState.selectedBoardId, appState.cards, handleError]);

  const updateCard = useCallback(async (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'order'>>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateCardAPI(id, updates);
      appDispatch({ type: 'UPDATE_CARD', payload: { id, updates } });
    } catch (error) {
      handleError(error, 'Failed to update card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteCard = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteCardAPI(id);
      appDispatch({ type: 'DELETE_CARD', payload: id });
    } catch (error) {
      handleError(error, 'Failed to delete card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const moveCard = useCallback(async (cardId: string, columnId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateCardAPI(cardId, { columnId });
      appDispatch({ type: 'MOVE_CARD', payload: { cardId, columnId } });
    } catch (error) {
      handleError(error, 'Failed to move card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeData = active.data.current as CardDragData | ColumnDragData;
    
    if (activeData.type === 'card') {
      const card = activeData.card;
      const overId = over.id as string;
      
      // Check if dropping on a different column
      if (overId !== card.columnId) {
        await moveCard(card.id, overId);
      }
    }
  }, [moveCard]);

  // Check for existing auth token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        uiDispatch({ type: 'SET_VIEW', payload: 'auth' });
        return;
      }
      
      try {
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const { user } = await response.json();
          appDispatch({ type: 'SET_USER', payload: user });
          uiDispatch({ type: 'SET_VIEW', payload: 'boards' });
          
          // Load user's boards
          const boards = await getUserBoards(user.id);
          appDispatch({ type: 'SET_BOARDS', payload: boards });
        } else {
          localStorage.removeItem('taskly_token');
          uiDispatch({ type: 'SET_VIEW', payload: 'auth' });
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('taskly_token');
        uiDispatch({ type: 'SET_VIEW', payload: 'auth' });
      }
    };
    
    checkAuth();
  }, []);

  const value: TasklyContextType = {
    // App state
    user: appState.user,
    boards: appState.boards,
    columns: appState.columns,
    cards: appState.cards,
    
    // UI state
    currentView: uiState.currentView,
    selectedBoardId: uiState.selectedBoardId,
    selectedCardId: uiState.selectedCardId,
    uiState,
    
    // Loading and error states
    isLoading,
    error,
    
    // Auth methods
    login,
    signUp,
    logout,
    
    // UI methods
    setView,
    setSelectedBoard,
    setSelectedCard,
    setAuthMode,
    clearError,
    
    // Data loading methods
    loadBoardData,
    
    // Board methods
    createBoard,
    updateBoard,
    deleteBoard,
    
    // Column methods
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    
    // Card methods
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    
    // Drag and drop
    handleDragEnd,
  };

  return (
    <TasklyContext.Provider value={value}>
      {children}
    </TasklyContext.Provider>
  );
}

export function useTaskly(): TasklyContextType {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}