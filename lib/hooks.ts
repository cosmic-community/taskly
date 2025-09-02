'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  User, 
  Board, 
  Column, 
  Card, 
  AppState, 
  ViewMode, 
  UIState, 
  LoginCredentials, 
  SignUpCredentials, 
  CreateBoardForm, 
  CreateColumnForm, 
  CreateCardForm, 
  EditCardForm 
} from '@/types';
import {
  getUserByEmail,
  createUser,
  getUserBoards,
  createBoard as cosmicCreateBoard,
  updateBoard as cosmicUpdateBoard,
  deleteBoard as cosmicDeleteBoard,
  getBoardColumns,
  createColumn as cosmicCreateColumn,
  updateColumn as cosmicUpdateColumn,
  deleteColumn as cosmicDeleteColumn,
  getColumnCards,
  getBoardCards,
  createCard as cosmicCreateCard,
  updateCard as cosmicUpdateCard,
  deleteCard as cosmicDeleteCard,
} from '@/lib/cosmic';
import { hashPassword, verifyPassword, generateToken, verifyToken } from '@/lib/auth';

export interface TasklyStore {
  // State
  user: User | null;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  uiState: UIState;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;

  // UI methods
  setView: (view: ViewMode, boardId?: string, cardId?: string) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;

  // Board methods
  createBoard: (form: CreateBoardForm) => Promise<Board>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  getBoardById: (id: string) => Board | undefined;

  // Column methods
  createColumn: (form: CreateColumnForm & { boardId: string }) => Promise<Column>;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  getColumnsByBoardId: (boardId: string) => Column[];
  addColumn: (boardId: string, title: string) => Promise<void>;

  // Card methods
  createCard: (form: CreateCardForm & { boardId: string; columnId: string }) => Promise<Card>;
  updateCard: (id: string, updates: Partial<EditCardForm>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  getCardById: (id: string) => Card | undefined;
  getCardsByColumnId: (columnId: string) => Card[];
  addCard: (columnId: string, title: string) => Promise<void>;

  // Data loading
  loadUserData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const TasklyContext = createContext<TasklyStore | null>(null);

export function TasklyProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [uiState, setUiState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      setUser(data.user);
      localStorage.setItem('taskly_token', data.token);
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
      await loadUserData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
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

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sign up failed');
      }

      setUser(data.user);
      localStorage.setItem('taskly_token', data.token);
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
      await loadUserData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setBoards([]);
    setColumns([]);
    setCards([]);
    setUiState({
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
    });
    localStorage.removeItem('taskly_token');
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('taskly_token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setUiState(prev => ({ ...prev, currentView: 'boards' }));
        await loadUserData();
      } else {
        localStorage.removeItem('taskly_token');
      }
    } catch (error) {
      localStorage.removeItem('taskly_token');
    }
  }, []);

  // UI methods
  const setView = useCallback((view: ViewMode, boardId?: string, cardId?: string) => {
    setUiState(prev => ({
      ...prev,
      currentView: view,
      selectedBoardId: boardId || null,
      selectedCardId: cardId || null,
    }));
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUiState(prev => ({ ...prev, authMode: mode }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Board methods
  const getBoardById = useCallback((id: string): Board | undefined => {
    return boards.find(board => board.id === id);
  }, [boards]);

  const createBoard = useCallback(async (form: CreateBoardForm): Promise<Board> => {
    if (!user) throw new Error('User not authenticated');
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create board');
      }

      const newBoard = data.board;
      setBoards(prev => [...prev, newBoard]);
      return newBoard;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update board');
      }

      setBoards(prev => prev.map(board => 
        board.id === id ? { ...board, ...updates } : board
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setBoards(prev => prev.filter(board => board.id !== id));
      setColumns(prev => prev.filter(column => column.boardId !== id));
      setCards(prev => prev.filter(card => card.boardId !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Column methods
  const getColumnsByBoardId = useCallback((boardId: string): Column[] => {
    return columns.filter(column => column.boardId === boardId);
  }, [columns]);

  const createColumn = useCallback(async (form: CreateColumnForm & { boardId: string }): Promise<Column> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create column');
      }

      const newColumn = data.column;
      setColumns(prev => [...prev, newColumn]);
      return newColumn;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addColumn = useCallback(async (boardId: string, title: string) => {
    const existingColumns = getColumnsByBoardId(boardId);
    const order = existingColumns.length;
    await createColumn({ boardId, title, order });
  }, [getColumnsByBoardId, createColumn]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/columns/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update column');
      }

      setColumns(prev => prev.map(column => 
        column.id === id ? { ...column, ...updates } : column
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete column');
      }

      const column = columns.find(c => c.id === id);
      if (column) {
        setColumns(prev => prev.filter(c => c.id !== id));
        setCards(prev => prev.filter(card => card.columnId !== id));
      }
    } finally {
      setIsLoading(false);
    }
  }, [columns]);

  // Card methods
  const getCardById = useCallback((id: string): Card | undefined => {
    return cards.find(card => card.id === id);
  }, [cards]);

  const getCardsByColumnId = useCallback((columnId: string): Card[] => {
    return cards.filter(card => card.columnId === columnId);
  }, [cards]);

  const createCard = useCallback(async (form: CreateCardForm & { boardId: string; columnId: string }): Promise<Card> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create card');
      }

      const newCard = data.card;
      setCards(prev => [...prev, newCard]);
      return newCard;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addCard = useCallback(async (columnId: string, title: string) => {
    const column = columns.find(c => c.id === columnId);
    if (!column) throw new Error('Column not found');
    
    const existingCards = getCardsByColumnId(columnId);
    const order = existingCards.length;
    await createCard({ 
      boardId: column.boardId, 
      columnId, 
      title, 
      order 
    });
  }, [columns, getCardsByColumnId, createCard]);

  const updateCard = useCallback(async (id: string, updates: Partial<EditCardForm>) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update card');
      }

      setCards(prev => prev.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('taskly_token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete card');
      }

      setCards(prev => prev.filter(card => card.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Data loading
  const loadUserData = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Load boards
      const userBoards = await getUserBoards(user.id);
      setBoards(userBoards);

      // Load columns and cards for all boards
      const allColumns: Column[] = [];
      const allCards: Card[] = [];

      for (const board of userBoards) {
        const boardColumns = await getBoardColumns(board.id);
        allColumns.push(...boardColumns);

        const boardCards = await getBoardCards(board.id);
        allCards.push(...boardCards);
      }

      setColumns(allColumns);
      setCards(allCards);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const refreshData = useCallback(async () => {
    await loadUserData();
  }, [loadUserData]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user, loadUserData]);

  const store: TasklyStore = {
    // State
    user,
    boards,
    columns,
    cards,
    uiState,
    isLoading,
    error,

    // Auth methods
    login,
    signUp,
    logout,
    checkAuth,

    // UI methods
    setView,
    setAuthMode,
    clearError,

    // Board methods
    createBoard,
    updateBoard,
    deleteBoard,
    getBoardById,

    // Column methods
    createColumn,
    updateColumn,
    deleteColumn,
    getColumnsByBoardId,
    addColumn,

    // Card methods
    createCard,
    updateCard,
    deleteCard,
    getCardById,
    getCardsByColumnId,
    addCard,

    // Data loading
    loadUserData,
    refreshData,
  };

  return (
    <TasklyContext.Provider value={store}>
      {children}
    </TasklyContext.Provider>
  );
}

export function useTaskly(): TasklyStore {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}