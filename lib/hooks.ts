import { useState, useEffect, useRef, useMemo } from 'react';
import { AppState, Board, Column, Card, User, AuthResponse, LoginCredentials, SignUpCredentials, UIState, ViewMode } from '@/types';
import {
  getUserBoards,
  createBoard as cosmicCreateBoard,
  updateBoard as cosmicUpdateBoard,
  deleteBoard as cosmicDeleteBoard,
  getBoardColumns,
  createColumn as cosmicCreateColumn,
  updateColumn as cosmicUpdateColumn,
  deleteColumn as cosmicDeleteColumn,
  getBoardCards,
  createCard as cosmicCreateCard,
  updateCard as cosmicUpdateCard,
  deleteCard as cosmicDeleteCard,
} from '@/lib/cosmic';

// Storage interface for local caching
interface StorageService {
  loadData(): Promise<AppState>;
  saveData(data: AppState): Promise<void>;
  clearData(): void;
}

// In-memory storage implementation
class MemoryStorageService implements StorageService {
  private data: AppState = {
    boards: [],
    columns: [],
    cards: [],
    user: null,
  };

  async loadData(): Promise<AppState> {
    return { ...this.data };
  }

  async saveData(data: AppState): Promise<void> {
    this.data = { ...data };
  }

  clearData(): void {
    this.data = {
      boards: [],
      columns: [],
      cards: [],
      user: null,
    };
  }
}

// Complete store interface
export interface TasklyStore {
  // App state
  appState: AppState;
  
  // UI state
  uiState: UIState;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // UI actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoard: (boardId: string | null) => void;
  setSelectedCard: (cardId: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  
  // Board actions
  createBoard: (title: string) => Promise<Board>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  reorderBoards: (boards: Board[]) => Promise<void>;
  
  // Column actions
  createColumn: (boardId: string, title: string) => Promise<Column>;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columns: Column[]) => Promise<void>;
  
  // Card actions
  createCard: (boardId: string, columnId: string, title: string, description?: string) => Promise<Card>;
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, destinationColumnId: string, newOrder: number) => Promise<void>;
  reorderCards: (columnId: string, cards: Card[]) => Promise<void>;
  
  // Data loading
  loadUserData: () => Promise<void>;
  refreshData: () => Promise<void>;
}

// Custom hook for Taskly store
export function useTaskly(): TasklyStore {
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });

  const [uiState, setUiState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const storage = useRef<StorageService>(new MemoryStorageService());

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('taskly_token');
      if (!token) return;

      try {
        const response = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const { user } = await response.json();
          setAppState(prev => ({ ...prev, user }));
          setUiState(prev => ({ ...prev, currentView: 'boards' }));
          // Load user data after authentication
          await loadUserData(user);
        } else {
          // Invalid token, clear it
          localStorage.removeItem('taskly_token');
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('taskly_token');
      }
    };

    initAuth();
  }, []);

  // Load user-specific data
  const loadUserData = async (user?: User) => {
    const currentUser = user || appState.user;
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const boards = await getUserBoards(currentUser.id);
      
      // Load columns and cards for all boards
      let allColumns: Column[] = [];
      let allCards: Card[] = [];
      
      for (const board of boards) {
        const [columns, cards] = await Promise.all([
          getBoardColumns(board.id),
          getBoardCards(board.id),
        ]);
        allColumns = [...allColumns, ...columns];
        allCards = [...allCards, ...cards];
      }

      const newAppState = {
        boards,
        columns: allColumns,
        cards: allCards,
        user: currentUser,
      };

      setAppState(newAppState);
      await storage.current.saveData(newAppState);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load your data. Please try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  };

  // UI Actions
  const setCurrentView = (view: ViewMode) => {
    setUiState(prev => ({ ...prev, currentView: view }));
  };

  const setSelectedBoard = (boardId: string | null) => {
    setUiState(prev => ({ ...prev, selectedBoardId: boardId }));
  };

  const setSelectedCard = (cardId: string | null) => {
    setUiState(prev => ({ ...prev, selectedCardId: cardId }));
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    setUiState(prev => ({ ...prev, authMode: mode }));
  };

  const clearError = () => {
    setError(null);
  };

  // Auth Actions
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      const { user, token }: AuthResponse = data;

      // Store token
      localStorage.setItem('taskly_token', token);

      // Update app state
      setAppState(prev => ({ ...prev, user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));

      // Load user data
      await loadUserData(user);
    } catch (error: any) {
      setError(error.message || 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      setError(null);

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

      const { user, token }: AuthResponse = data;

      // Store token
      localStorage.setItem('taskly_token', token);

      // Update app state
      setAppState(prev => ({ ...prev, user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));

      // Load user data (will be empty for new users)
      await loadUserData(user);
    } catch (error: any) {
      setError(error.message || 'Sign up failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('taskly_token');
    setAppState({ boards: [], columns: [], cards: [], user: null });
    setUiState({ currentView: 'auth', selectedBoardId: null, selectedCardId: null, authMode: 'login' });
    storage.current.clearData();
  };

  // Board Actions
  const createBoard = async (title: string): Promise<Board> => {
    if (!appState.user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      const order = Math.max(...appState.boards.map(b => b.order), 0) + 1;
      const board = await cosmicCreateBoard(title, appState.user.id, order);
      
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, board],
      }));

      return board;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => {
    try {
      setIsLoading(true);
      await cosmicUpdateBoard(id, updates);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board => 
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBoard = async (id: string) => {
    try {
      setIsLoading(true);
      await cosmicDeleteBoard(id);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const reorderBoards = async (boards: Board[]) => {
    setAppState(prev => ({ ...prev, boards }));
    
    // Update order in background
    try {
      await Promise.all(
        boards.map((board, index) => 
          cosmicUpdateBoard(board.id, { order: index })
        )
      );
    } catch (error) {
      console.error('Failed to save board order:', error);
    }
  };

  // Column Actions
  const createColumn = async (boardId: string, title: string): Promise<Column> => {
    try {
      setIsLoading(true);
      const boardColumns = appState.columns.filter(c => c.boardId === boardId);
      const order = Math.max(...boardColumns.map(c => c.order), 0) + 1;
      const column = await cosmicCreateColumn(boardId, title, order);
      
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, column],
      }));

      return column;
    } finally {
      setIsLoading(false);
    }
  };

  const updateColumn = async (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => {
    try {
      setIsLoading(true);
      await cosmicUpdateColumn(id, updates);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => 
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteColumn = async (id: string) => {
    try {
      setIsLoading(true);
      await cosmicDeleteColumn(id);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const reorderColumns = async (boardId: string, columns: Column[]) => {
    setAppState(prev => ({
      ...prev,
      columns: [
        ...prev.columns.filter(c => c.boardId !== boardId),
        ...columns,
      ],
    }));
    
    // Update order in background
    try {
      await Promise.all(
        columns.map((column, index) => 
          cosmicUpdateColumn(column.id, { order: index })
        )
      );
    } catch (error) {
      console.error('Failed to save column order:', error);
    }
  };

  // Card Actions
  const createCard = async (
    boardId: string, 
    columnId: string, 
    title: string, 
    description?: string
  ): Promise<Card> => {
    try {
      setIsLoading(true);
      const columnCards = appState.cards.filter(c => c.columnId === columnId);
      const order = Math.max(...columnCards.map(c => c.order), 0) + 1;
      const card = await cosmicCreateCard(boardId, columnId, title, description, undefined, undefined, order);
      
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, card],
      }));

      return card;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCard = async (
    id: string, 
    updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>
  ) => {
    try {
      setIsLoading(true);
      await cosmicUpdateCard(id, updates);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCard = async (id: string) => {
    try {
      setIsLoading(true);
      await cosmicDeleteCard(id);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const moveCard = async (cardId: string, destinationColumnId: string, newOrder: number) => {
    try {
      await cosmicUpdateCard(cardId, { columnId: destinationColumnId, order: newOrder });
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === cardId 
            ? { ...card, columnId: destinationColumnId, order: newOrder }
            : card
        ),
      }));
    } catch (error) {
      console.error('Failed to move card:', error);
    }
  };

  const reorderCards = async (columnId: string, cards: Card[]) => {
    setAppState(prev => ({
      ...prev,
      cards: [
        ...prev.cards.filter(c => c.columnId !== columnId),
        ...cards,
      ],
    }));
    
    // Update order in background
    try {
      await Promise.all(
        cards.map((card, index) => 
          cosmicUpdateCard(card.id, { order: index })
        )
      );
    } catch (error) {
      console.error('Failed to save card order:', error);
    }
  };

  // Data loading
  const refreshData = async () => {
    await loadUserData();
  };

  return {
    appState,
    uiState,
    isLoading,
    error,
    setCurrentView,
    setSelectedBoard,
    setSelectedCard,
    setAuthMode,
    clearError,
    login,
    signUp,
    logout,
    createBoard,
    updateBoard,
    deleteBoard,
    reorderBoards,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderCards,
    loadUserData: () => loadUserData(),
    refreshData,
  };
}