'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  Board, 
  Column, 
  Card, 
  AppState, 
  UIState, 
  ViewMode, 
  LoginCredentials, 
  SignUpCredentials,
  AuthResponse 
} from '@/types';
import { StorageService } from '@/lib/storage';

// Create context
interface TasklyContextValue {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;
  
  // Computed state
  user: User | null;
  currentBoard: Board | null;
  selectedCard: Card | null;
  
  // UI Actions
  setCurrentView: (view: ViewMode) => void;
  selectBoard: (boardId: string | null) => void;
  selectCard: (cardId: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Auth Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  authenticateWithToken: (token: string) => Promise<void>;
  
  // Data Actions
  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, sourceIndex: number, destinationIndex: number) => Promise<void>;
  
  createCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, columnId: string, order: number) => Promise<void>;
}

const TasklyContext = createContext<TasklyContextValue | null>(null);

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

// Storage service
const storage = new StorageService();

// Hook
export function useTaskly(): TasklyContextValue {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}

// Provider component
export function TasklyProvider({ children }: { children: ReactNode }) {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed state
  const user = appState.user;
  const currentBoard = appState.boards.find(b => b.id === uiState.selectedBoardId) || null;
  const selectedCard = appState.cards.find(c => c.id === uiState.selectedCardId) || null;

  // Load initial data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Try to authenticate with stored token
        const token = localStorage.getItem('taskly_token');
        if (token) {
          await authenticateWithToken(token);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        localStorage.removeItem('taskly_token');
      }
    };

    initializeApp();
  }, []);

  // Helper function to handle API errors
  const handleError = (error: any) => {
    console.error('API Error:', error);
    const message = error?.message || 'An unexpected error occurred';
    setError(message);
    setIsLoading(false);
  };

  // UI Actions
  const setCurrentView = (view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
    clearError();
  };

  const selectBoard = (boardId: string | null) => {
    setUIState(prev => ({ 
      ...prev, 
      selectedBoardId: boardId,
      currentView: boardId ? 'board' : 'boards'
    }));
    clearError();
  };

  const selectCard = (cardId: string | null) => {
    setUIState(prev => ({ 
      ...prev, 
      selectedCardId: cardId,
      currentView: cardId ? 'card' : 'board'
    }));
    clearError();
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
    clearError();
  };

  const clearError = () => {
    setError(null);
  };

  // Auth Actions
  const login = async (credentials: LoginCredentials) => {
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

      // Store token and user
      localStorage.setItem('taskly_token', data.token);
      setAppState(prev => ({ ...prev, user: data.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadBoards();
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const signUp = async (credentials: SignUpCredentials) => {
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

      // Store token and user
      localStorage.setItem('taskly_token', data.token);
      setAppState(prev => ({ ...prev, user: data.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards (will be empty for new users)
      await loadBoards();
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const authenticateWithToken = async (token: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Set user and switch to boards view
      setAppState(prev => ({ ...prev, user: data.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadBoards();
      setIsLoading(false);
    } catch (error) {
      localStorage.removeItem('taskly_token');
      handleError(error);
      setUIState(prev => ({ ...prev, currentView: 'auth' }));
    }
  };

  const logout = () => {
    localStorage.removeItem('taskly_token');
    setAppState(initialAppState);
    setUIState(initialUIState);
    clearError();
  };

  // Data Actions
  const loadBoards = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/boards', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load boards');
      }

      setAppState(prev => ({ ...prev, boards: data.boards }));
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const createBoard = async (title: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create board');
      }

      setAppState(prev => ({ 
        ...prev, 
        boards: [...prev.boards, data.board] 
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Board>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/boards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update board');
      }

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board => 
          board.id === id ? { ...board, ...updates } : board
        )
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const deleteBoard = async (id: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/boards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete board');
      }

      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));

      // If we're currently viewing this board, go back to boards
      if (uiState.selectedBoardId === id) {
        setUIState(prev => ({ 
          ...prev, 
          selectedBoardId: null, 
          currentView: 'boards' 
        }));
      }
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const createColumn = async (boardId: string, title: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/columns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ boardId, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create column');
      }

      setAppState(prev => ({ 
        ...prev, 
        columns: [...prev.columns, data.column] 
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const updateColumn = async (id: string, updates: Partial<Column>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/columns/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update column');
      }

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => 
          column.id === id ? { ...column, ...updates } : column
        )
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const deleteColumn = async (id: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/columns/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete column');
      }

      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const reorderColumns = async (boardId: string, sourceIndex: number, destinationIndex: number) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/columns/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ boardId, sourceIndex, destinationIndex }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reorder columns');
      }

      setAppState(prev => ({
        ...prev,
        columns: data.columns
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const createCard = async (columnId: string, title: string, description?: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch('/api/cards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ columnId, title, description }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create card');
      }

      setAppState(prev => ({ 
        ...prev, 
        cards: [...prev.cards, data.card] 
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        )
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const deleteCard = async (id: string) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/cards/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const moveCard = async (cardId: string, columnId: string, order: number) => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('taskly_token');
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ columnId, order }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to move card');
      }

      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === cardId ? { ...card, columnId, order } : card
        )
      }));
      
      setIsLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  const contextValue: TasklyContextValue = {
    // State
    appState,
    uiState,
    isLoading,
    error,
    
    // Computed state
    user,
    currentBoard,
    selectedCard,
    
    // UI Actions
    setCurrentView,
    selectBoard,
    selectCard,
    setAuthMode,
    clearError,
    
    // Auth Actions
    login,
    signUp,
    logout,
    authenticateWithToken,
    
    // Data Actions
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    
    createCard,
    updateCard,
    deleteCard,
    moveCard,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}