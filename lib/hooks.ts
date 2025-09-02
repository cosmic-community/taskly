'use client';

import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { 
  AppState, 
  UIState, 
  User, 
  Board, 
  Column, 
  Card, 
  ViewMode, 
  LoginCredentials, 
  SignUpCredentials,
  AuthResponse 
} from '@/types';

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
  | { type: 'REORDER_COLUMNS'; payload: { boardId: string; columnIds: string[] } }
  | { type: 'REORDER_CARDS'; payload: { columnId: string; cardIds: string[] } }
  | { type: 'MOVE_CARD'; payload: { cardId: string; newColumnId: string; newIndex: number } };

type UIAction =
  | { type: 'SET_CURRENT_VIEW'; payload: ViewMode }
  | { type: 'SET_SELECTED_BOARD_ID'; payload: string | null }
  | { type: 'SET_SELECTED_CARD_ID'; payload: string | null }
  | { type: 'SET_AUTH_MODE'; payload: 'login' | 'signup' };

// Reducers
function appReducer(state: AppState, action: AppAction): AppState {
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
          board.id === action.payload.id 
            ? { ...board, ...action.payload.updates }
            : board
        ),
      };
    case 'DELETE_BOARD':
      return {
        ...state,
        boards: state.boards.filter(board => board.id !== action.payload),
        columns: state.columns.filter(column => column.boardId !== action.payload),
        cards: state.cards.filter(card => card.boardId !== action.payload),
      };
    case 'SET_COLUMNS':
      return { ...state, columns: action.payload };
    case 'ADD_COLUMN':
      return { ...state, columns: [...state.columns, action.payload] };
    case 'UPDATE_COLUMN':
      return {
        ...state,
        columns: state.columns.map(column =>
          column.id === action.payload.id
            ? { ...column, ...action.payload.updates }
            : column
        ),
      };
    case 'DELETE_COLUMN':
      return {
        ...state,
        columns: state.columns.filter(column => column.id !== action.payload),
        cards: state.cards.filter(card => card.columnId !== action.payload),
      };
    case 'SET_CARDS':
      return { ...state, cards: action.payload };
    case 'ADD_CARD':
      return { ...state, cards: [...state.cards, action.payload] };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id
            ? { ...card, ...action.payload.updates }
            : card
        ),
      };
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload),
      };
    case 'REORDER_COLUMNS':
      const { boardId, columnIds } = action.payload;
      return {
        ...state,
        columns: state.columns.map(column => {
          if (column.boardId === boardId) {
            const newIndex = columnIds.indexOf(column.id);
            return { ...column, order: newIndex };
          }
          return column;
        }),
      };
    case 'REORDER_CARDS':
      const { columnId, cardIds } = action.payload;
      return {
        ...state,
        cards: state.cards.map(card => {
          if (card.columnId === columnId) {
            const newIndex = cardIds.indexOf(card.id);
            return { ...card, order: newIndex };
          }
          return card;
        }),
      };
    case 'MOVE_CARD':
      const { cardId, newColumnId, newIndex } = action.payload;
      return {
        ...state,
        cards: state.cards.map(card => {
          if (card.id === cardId) {
            return { ...card, columnId: newColumnId, order: newIndex };
          }
          return card;
        }),
      };
    default:
      return state;
  }
}

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_CURRENT_VIEW':
      return { ...state, currentView: action.payload };
    case 'SET_SELECTED_BOARD_ID':
      return { ...state, selectedBoardId: action.payload };
    case 'SET_SELECTED_CARD_ID':
      return { ...state, selectedCardId: action.payload };
    case 'SET_AUTH_MODE':
      return { ...state, authMode: action.payload };
    default:
      return state;
  }
}

// Context interface
interface TasklyContextType {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  
  // Drag state
  draggedCard: Card | null;
  draggedColumn: Column | null;
  
  // Auth methods
  user: User | null;
  checkAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // UI methods
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  setView: (view: ViewMode) => void;
  selectedBoardId: string | null;
  setSelectedBoardId: (id: string | null) => void;
  selectedCardId: string | null;
  setSelectedCardId: (id: string | null) => void;
  
  // Data access methods
  boards: Board[];
  columns: Column[];
  cards: Card[];
  getBoardById: (id: string) => Board | undefined;
  getCardById: (id: string) => Card | undefined;
  getColumnsByBoardId: (boardId: string) => Column[];
  getCardsByColumnId: (columnId: string) => Card[];
  
  // CRUD operations
  addBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  addColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  addCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  
  // Data loading
  loadBoardData: (boardId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Drag and drop
  handleDragStart: (event: any) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

const TasklyContext = createContext<TasklyContextType | null>(null);

// Provider component
export function TasklyProvider({ children }: { children: ReactNode }) {
  const [appState, dispatchApp] = useReducer(appReducer, initialAppState);
  const [uiState, dispatchUI] = useReducer(uiReducer, initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);

  // Auth methods
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
        return;
      }

      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { user } = await response.json();
        dispatchApp({ type: 'SET_USER', payload: user });
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
        await loadUserBoards();
      } else {
        localStorage.removeItem('taskly_token');
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('taskly_token', data.token);
        dispatchApp({ type: 'SET_USER', payload: data.user });
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
        await loadUserBoards();
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    if (credentials.password !== credentials.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
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

      if (response.ok) {
        localStorage.setItem('taskly_token', data.token);
        dispatchApp({ type: 'SET_USER', payload: data.user });
        dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'boards' });
        // No boards to load for new users
        dispatchApp({ type: 'SET_BOARDS', payload: [] });
      } else {
        setError(data.error || 'Sign up failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('taskly_token');
    dispatchApp({ type: 'SET_USER', payload: null });
    dispatchApp({ type: 'SET_BOARDS', payload: [] });
    dispatchApp({ type: 'SET_COLUMNS', payload: [] });
    dispatchApp({ type: 'SET_CARDS', payload: [] });
    dispatchUI({ type: 'SET_CURRENT_VIEW', payload: 'auth' });
    dispatchUI({ type: 'SET_SELECTED_BOARD_ID', payload: null });
    dispatchUI({ type: 'SET_SELECTED_CARD_ID', payload: null });
    setError(null);
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    dispatchUI({ type: 'SET_AUTH_MODE', payload: mode });
    setError(null);
  };

  const clearError = () => setError(null);

  // UI methods
  const setCurrentView = (view: ViewMode) => {
    dispatchUI({ type: 'SET_CURRENT_VIEW', payload: view });
  };

  const setView = (view: ViewMode) => {
    dispatchUI({ type: 'SET_CURRENT_VIEW', payload: view });
  };

  const setSelectedBoardId = (id: string | null) => {
    dispatchUI({ type: 'SET_SELECTED_BOARD_ID', payload: id });
  };

  const setSelectedCardId = (id: string | null) => {
    dispatchUI({ type: 'SET_SELECTED_CARD_ID', payload: id });
  };

  // Data access methods
  const getBoardById = (id: string): Board | undefined => {
    return appState.boards.find(board => board.id === id);
  };

  const getCardById = (id: string): Card | undefined => {
    return appState.cards.find(card => card.id === id);
  };

  const getColumnsByBoardId = (boardId: string): Column[] => {
    return appState.columns
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  };

  const getCardsByColumnId = (columnId: string): Card[] => {
    return appState.cards
      .filter(card => card.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  };

  // Data loading methods
  const loadUserBoards = async () => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch('/api/boards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const { boards } = await response.json();
        dispatchApp({ type: 'SET_BOARDS', payload: boards || [] });
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  };

  const loadBoardData = async (boardId: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      // Load columns
      const columnsResponse = await fetch(`/api/columns?boardId=${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (columnsResponse.ok) {
        const { columns } = await columnsResponse.json();
        dispatchApp({ type: 'SET_COLUMNS', payload: columns || [] });
      }

      // Load cards
      const cardsResponse = await fetch(`/api/cards?boardId=${boardId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (cardsResponse.ok) {
        const { cards } = await cardsResponse.json();
        dispatchApp({ type: 'SET_CARDS', payload: cards || [] });
      }
    } catch (error) {
      console.error('Failed to load board data:', error);
    }
  };

  const refreshData = async () => {
    if (uiState.currentView === 'boards') {
      await loadUserBoards();
    } else if (uiState.currentView === 'board' && uiState.selectedBoardId) {
      await loadBoardData(uiState.selectedBoardId);
    }
  };

  // CRUD operations
  const addBoard = async (title: string) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (response.ok) {
        const { board } = await response.json();
        dispatchApp({ type: 'ADD_BOARD', payload: board });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to create board');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Board>) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/boards/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        dispatchApp({ type: 'UPDATE_BOARD', payload: { id, updates } });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to update board');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const deleteBoard = async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatchApp({ type: 'DELETE_BOARD', payload: id });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to delete board');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const addColumn = async (boardId: string, title: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boardId, title }),
      });

      if (response.ok) {
        const { column } = await response.json();
        dispatchApp({ type: 'ADD_COLUMN', payload: column });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to create column');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const updateColumn = async (id: string, updates: Partial<Column>) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/columns/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        dispatchApp({ type: 'UPDATE_COLUMN', payload: { id, updates } });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to update column');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatchApp({ type: 'DELETE_COLUMN', payload: id });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to delete column');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const addCard = async (columnId: string, title: string, description?: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      // Find the column to get boardId
      const column = appState.columns.find(col => col.id === columnId);
      if (!column) return;

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId: column.boardId,
          columnId,
          title,
          description,
        }),
      });

      if (response.ok) {
        const { card } = await response.json();
        dispatchApp({ type: 'ADD_CARD', payload: card });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to create card');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        dispatchApp({ type: 'UPDATE_CARD', payload: { id, updates } });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to update card');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const deleteCard = async (id: string) => {
    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatchApp({ type: 'DELETE_CARD', payload: id });
      } else {
        const { error } = await response.json();
        setError(error || 'Failed to delete card');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'card') {
      setDraggedCard(activeData.card);
    } else if (activeData?.type === 'column') {
      setDraggedColumn(activeData.column);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setDraggedCard(null);
    setDraggedColumn(null);

    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle card drag
    if (activeData?.type === 'card') {
      const card = activeData.card;
      
      if (overData?.type === 'column' && overData.column.id !== card.columnId) {
        // Moving card to different column
        try {
          const token = localStorage.getItem('taskly_token');
          if (!token) return;

          const response = await fetch(`/api/cards/${card.id}/move`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              newColumnId: overData.column.id,
              newIndex: 0,
            }),
          });

          if (response.ok) {
            dispatchApp({ 
              type: 'MOVE_CARD', 
              payload: { 
                cardId: card.id, 
                newColumnId: overData.column.id, 
                newIndex: 0 
              } 
            });
          }
        } catch (error) {
          console.error('Failed to move card:', error);
        }
      }
    }

    // Handle column drag (reordering)
    if (activeData?.type === 'column' && overData?.type === 'column') {
      const activeColumn = activeData.column;
      const overColumn = overData.column;

      if (activeColumn.id !== overColumn.id && activeColumn.boardId === overColumn.boardId) {
        const columns = getColumnsByBoardId(activeColumn.boardId);
        const activeIndex = columns.findIndex(col => col.id === activeColumn.id);
        const overIndex = columns.findIndex(col => col.id === overColumn.id);

        const reorderedColumns = arrayMove(columns, activeIndex, overIndex);
        const columnIds = reorderedColumns.map(col => col.id);

        dispatchApp({ 
          type: 'REORDER_COLUMNS', 
          payload: { boardId: activeColumn.boardId, columnIds } 
        });
      }
    }
  };

  // Initialize auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const contextValue: TasklyContextType = {
    // State
    appState,
    uiState,
    isLoading,
    error,
    isInitialized,
    
    // Drag state
    draggedCard,
    draggedColumn,
    
    // Auth methods
    user: appState.user,
    checkAuth,
    login,
    signUp,
    logout,
    setAuthMode,
    clearError,
    
    // UI methods
    currentView: uiState.currentView,
    setCurrentView,
    setView,
    selectedBoardId: uiState.selectedBoardId,
    setSelectedBoardId,
    selectedCardId: uiState.selectedCardId,
    setSelectedCardId,
    
    // Data access methods
    boards: appState.boards,
    columns: appState.columns,
    cards: appState.cards,
    getBoardById,
    getCardById,
    getColumnsByBoardId,
    getCardsByColumnId,
    
    // CRUD operations
    addBoard,
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
    refreshData,
    
    // Drag and drop
    handleDragStart,
    handleDragEnd,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook to use the context
export function useTaskly(): TasklyContextType {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}