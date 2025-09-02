'use client';

import { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { User, Board, Column, Card, AppState, UIState, LoginCredentials, SignUpCredentials, ViewMode, DragEndEvent } from '@/types';

// API helper functions
const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = localStorage.getItem('taskly_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
};

// Auth API functions
const authApi = {
  login: async (credentials: LoginCredentials) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  signup: async (credentials: SignUpCredentials) => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  verify: async () => {
    return apiRequest('/api/auth/verify');
  },
};

// Board API functions
const boardApi = {
  getBoards: async () => {
    return apiRequest('/api/boards');
  },

  createBoard: async (title: string) => {
    return apiRequest('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  updateBoard: async (id: string, updates: Partial<Board>) => {
    return apiRequest(`/api/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteBoard: async (id: string) => {
    return apiRequest(`/api/boards/${id}`, {
      method: 'DELETE',
    });
  },
};

// Column API functions
const columnApi = {
  getColumns: async (boardId: string) => {
    return apiRequest(`/api/columns?boardId=${boardId}`);
  },

  createColumn: async (boardId: string, title: string) => {
    return apiRequest('/api/columns', {
      method: 'POST',
      body: JSON.stringify({ boardId, title }),
    });
  },

  updateColumn: async (id: string, updates: Partial<Column>) => {
    return apiRequest(`/api/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteColumn: async (id: string) => {
    return apiRequest(`/api/columns/${id}`, {
      method: 'DELETE',
    });
  },

  reorderColumns: async (boardId: string, columnOrders: { id: string; order: number }[]) => {
    return apiRequest('/api/columns/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ boardId, columnOrders }),
    });
  },
};

// Card API functions
const cardApi = {
  getCards: async (boardId: string) => {
    return apiRequest(`/api/cards?boardId=${boardId}`);
  },

  createCard: async (boardId: string, columnId: string, title: string) => {
    return apiRequest('/api/cards', {
      method: 'POST',
      body: JSON.stringify({ boardId, columnId, title }),
    });
  },

  updateCard: async (id: string, updates: Partial<Card>) => {
    return apiRequest(`/api/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteCard: async (id: string) => {
    return apiRequest(`/api/cards/${id}`, {
      method: 'DELETE',
    });
  },

  moveCard: async (id: string, columnId: string, order: number) => {
    return apiRequest(`/api/cards/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ columnId, order }),
    });
  },
};

// Define the context type
interface TasklyContextType {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  
  // Computed
  currentBoard: Board | null;
  boardColumns: Column[];
  selectedCard: Card | null;
  boards: Board[];
  cards: Card[];
  user: User | null;
  selectedBoardId: string | null;
  
  // Auth
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  
  // Boards
  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<Board>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  getBoardById: (id: string) => Board | null;
  
  // Columns
  loadColumns: (boardId: string) => Promise<void>;
  createColumn: (boardId: string, title: string) => Promise<Column>;
  addColumn: (boardId: string, title: string) => Promise<Column>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  getColumnsByBoardId: (boardId: string) => Column[];
  
  // Cards
  loadCards: (boardId: string) => Promise<void>;
  createCard: (boardId: string, columnId: string, title: string) => Promise<Card>;
  addCard: (boardId: string, columnId: string, title: string) => Promise<Card>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (id: string, columnId: string, order: number) => Promise<void>;
  getCardById: (id: string) => Card | null;
  getCardsByColumnId: (columnId: string) => Card[];
  
  // UI
  setAuthMode: (mode: 'login' | 'signup') => void;
  setCurrentView: (view: ViewMode) => void;
  setView: (view: ViewMode) => void;
  selectBoard: (boardId: string | null) => void;
  selectCard: (cardId: string | null) => void;
  setSelectedCardId: (cardId: string | null) => void;
  clearError: () => void;
  
  // Drag & Drop
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

// Create context
const TasklyContext = createContext<TasklyContextType | null>(null);

// Main hook
export function useTaskly() {
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auth functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { user, token } = await authApi.login(credentials);
      localStorage.setItem('taskly_token', token);
      
      setAppState(prev => ({ ...prev, user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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

      const { user, token } = await authApi.signup(credentials);
      localStorage.setItem('taskly_token', token);
      
      setAppState(prev => ({ ...prev, user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('taskly_token');
    setAppState({ boards: [], columns: [], cards: [], user: null });
    setUIState({ currentView: 'auth', selectedBoardId: null, selectedCardId: null, authMode: 'login' });
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('taskly_token');
    if (token) {
      try {
        const { user } = await authApi.verify();
        setAppState(prev => ({ ...prev, user }));
        setUIState(prev => ({ ...prev, currentView: 'boards' }));
      } catch (err) {
        localStorage.removeItem('taskly_token');
        setUIState(prev => ({ ...prev, currentView: 'auth' }));
      }
    }
  }, []);

  // Board functions
  const loadBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const boards = await boardApi.getBoards();
      setAppState(prev => ({ ...prev, boards }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBoard = useCallback(async (title: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const board = await boardApi.createBoard(title);
      setAppState(prev => ({ ...prev, boards: [...prev.boards, board] }));
      
      return board;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create board');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      await boardApi.updateBoard(id, updates);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board => 
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update board');
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      await boardApi.deleteBoard(id);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete board');
    }
  }, []);

  const getBoardById = useCallback((id: string): Board | null => {
    return appState.boards.find(board => board.id === id) || null;
  }, [appState.boards]);

  // Column functions
  const loadColumns = useCallback(async (boardId: string) => {
    try {
      const columns = await columnApi.getColumns(boardId);
      setAppState(prev => ({ ...prev, columns }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load columns');
    }
  }, []);

  const createColumn = useCallback(async (boardId: string, title: string) => {
    try {
      const column = await columnApi.createColumn(boardId, title);
      setAppState(prev => ({ ...prev, columns: [...prev.columns, column] }));
      return column;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create column');
      throw err;
    }
  }, []);

  const addColumn = useCallback(async (boardId: string, title: string) => {
    return createColumn(boardId, title);
  }, [createColumn]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    try {
      await columnApi.updateColumn(id, updates);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => 
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update column');
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      await columnApi.deleteColumn(id);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete column');
    }
  }, []);

  const getColumnsByBoardId = useCallback((boardId: string): Column[] => {
    return appState.columns.filter(column => column.boardId === boardId);
  }, [appState.columns]);

  // Card functions
  const loadCards = useCallback(async (boardId: string) => {
    try {
      const cards = await cardApi.getCards(boardId);
      setAppState(prev => ({ ...prev, cards }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards');
    }
  }, []);

  const createCard = useCallback(async (boardId: string, columnId: string, title: string) => {
    try {
      const card = await cardApi.createCard(boardId, columnId, title);
      setAppState(prev => ({ ...prev, cards: [...prev.cards, card] }));
      return card;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card');
      throw err;
    }
  }, []);

  const addCard = useCallback(async (boardId: string, columnId: string, title: string) => {
    return createCard(boardId, columnId, title);
  }, [createCard]);

  const updateCard = useCallback(async (id: string, updates: Partial<Card>) => {
    try {
      await cardApi.updateCard(id, updates);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update card');
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      await cardApi.deleteCard(id);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card');
    }
  }, []);

  const moveCard = useCallback(async (id: string, columnId: string, order: number) => {
    try {
      await cardApi.moveCard(id, columnId, order);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, columnId, order } : card
        ),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move card');
    }
  }, []);

  const getCardById = useCallback((id: string): Card | null => {
    return appState.cards.find(card => card.id === id) || null;
  }, [appState.cards]);

  const getCardsByColumnId = useCallback((columnId: string): Card[] => {
    return appState.cards.filter(card => card.columnId === columnId);
  }, [appState.cards]);

  // UI state functions
  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
  }, []);

  const setCurrentView = useCallback((view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setView = useCallback((view: ViewMode) => {
    setCurrentView(view);
  }, [setCurrentView]);

  const selectBoard = useCallback((boardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedBoardId: boardId }));
  }, []);

  const selectCard = useCallback((cardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: cardId }));
  }, []);

  const setSelectedCardId = useCallback((cardId: string | null) => {
    selectCard(cardId);
  }, [selectCard]);

  // Load board data when a board is selected
  useEffect(() => {
    if (uiState.selectedBoardId && appState.user) {
      loadColumns(uiState.selectedBoardId);
      loadCards(uiState.selectedBoardId);
    }
  }, [uiState.selectedBoardId, appState.user, loadColumns, loadCards]);

  // Initial auth check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load boards when user is authenticated
  useEffect(() => {
    if (appState.user && uiState.currentView === 'boards') {
      loadBoards();
    }
  }, [appState.user, uiState.currentView, loadBoards]);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    // Handle card movement
    const activeCard = appState.cards.find(card => card.id === active.id);
    if (activeCard) {
      const overColumnId = over.id as string;
      const overCards = appState.cards.filter(card => card.columnId === overColumnId);
      const newOrder = overCards.length > 0 ? Math.max(...overCards.map(card => card.order)) + 1 : 1;
      
      try {
        await moveCard(activeCard.id, overColumnId, newOrder);
      } catch (err) {
        // Error is already handled by moveCard
      }
    }
  }, [appState.cards, moveCard]);

  // Computed values
  const currentBoard = useMemo(() => {
    return appState.boards.find(board => board.id === uiState.selectedBoardId) || null;
  }, [appState.boards, uiState.selectedBoardId]);

  const boardColumns = useMemo(() => {
    return appState.columns
      .filter(column => column.boardId === uiState.selectedBoardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns, uiState.selectedBoardId]);

  const selectedCard = useMemo(() => {
    return appState.cards.find(card => card.id === uiState.selectedCardId) || null;
  }, [appState.cards, uiState.selectedCardId]);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,
    
    // Computed
    currentBoard,
    boardColumns,
    selectedCard,
    boards: appState.boards,
    cards: appState.cards,
    user: appState.user,
    selectedBoardId: uiState.selectedBoardId,
    
    // Auth
    login,
    signUp,
    logout,
    checkAuth,
    
    // Boards
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    getBoardById,
    
    // Columns
    loadColumns,
    createColumn,
    addColumn,
    updateColumn,
    deleteColumn,
    getColumnsByBoardId,
    
    // Cards
    loadCards,
    createCard,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    getCardById,
    getCardsByColumnId,
    
    // UI
    setAuthMode,
    setCurrentView,
    setView,
    selectBoard,
    selectCard,
    setSelectedCardId,
    clearError,
    
    // Drag & Drop
    handleDragEnd,
  };
}

// Provider component
export function TasklyProvider({ children }: { children: React.ReactNode }) {
  const taskly = useTaskly();

  return (
    <TasklyContext.Provider value={taskly}>
      {children}
    </TasklyContext.Provider>
  );
}

// Hook to use the context
export function useTasklyContext(): TasklyContextType {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTasklyContext must be used within a TasklyProvider');
  }
  return context;
}