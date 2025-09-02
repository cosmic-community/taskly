import { useState, useEffect, useCallback } from 'react';
import { 
  AppState, 
  User, 
  Board, 
  Column, 
  Card, 
  UIState, 
  ViewMode, 
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  LoginCredentials,
  SignUpCredentials,
  AuthResponse
} from '@/types';

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

// Custom hook for managing Taskly application state
export const useTaskly = () => {
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    setIsLoading(true);
    try {
      // Check for stored auth token
      const token = localStorage.getItem('taskly_token');
      if (token) {
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const { user } = await response.json();
          setAppState(prev => ({ ...prev, user }));
          setUIState(prev => ({ ...prev, currentView: 'boards' }));
          
          // Load user's boards
          await loadUserBoards(user.id);
        } else {
          // Invalid token, remove it
          localStorage.removeItem('taskly_token');
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
      localStorage.removeItem('taskly_token');
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication methods
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store token and update state
      localStorage.setItem('taskly_token', authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user's boards
      await loadUserBoards(authResponse.user.id);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
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
        headers: {
          'Content-Type': 'application/json',
        },
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
      
      // Store token and update state
      localStorage.setItem('taskly_token', authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Initialize empty boards for new user
      setAppState(prev => ({ ...prev, boards: [], columns: [], cards: [] }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('taskly_token');
    setAppState(initialAppState);
    setUIState(initialUIState);
  };

  // API helper with authentication
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('taskly_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      logout();
      throw new Error('Authentication expired. Please log in again.');
    }

    return response;
  };

  // Board operations
  const loadUserBoards = async (userId: string) => {
    try {
      const response = await authenticatedFetch(`/api/boards?userId=${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        setAppState(prev => ({
          ...prev,
          boards: data.boards || [],
          columns: data.columns || [],
          cards: data.cards || [],
        }));
      }
    } catch (error) {
      console.error('Error loading boards:', error);
      setError('Failed to load boards');
    }
  };

  const createBoard = async (form: CreateBoardForm) => {
    if (!appState.user) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          userId: appState.user.id,
          order: appState.boards.length,
        }),
      });

      if (response.ok) {
        const newBoard: Board = await response.json();
        setAppState(prev => ({
          ...prev,
          boards: [...prev.boards, newBoard],
        }));
        return newBoard;
      } else {
        throw new Error('Failed to create board');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create board';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/boards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedBoard: Board = await response.json();
        setAppState(prev => ({
          ...prev,
          boards: prev.boards.map(board => 
            board.id === id ? updatedBoard : board
          ),
        }));
      } else {
        throw new Error('Failed to update board');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update board';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBoard = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/boards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppState(prev => ({
          ...prev,
          boards: prev.boards.filter(board => board.id !== id),
          columns: prev.columns.filter(column => column.boardId !== id),
          cards: prev.cards.filter(card => card.boardId !== id),
        }));

        // If we're currently viewing this board, go back to boards list
        if (uiState.selectedBoardId === id) {
          setUIState(prev => ({
            ...prev,
            currentView: 'boards',
            selectedBoardId: null,
            selectedCardId: null,
          }));
        }
      } else {
        throw new Error('Failed to delete board');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete board';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Column operations
  const createColumn = async (boardId: string, form: CreateColumnForm) => {
    setIsLoading(true);
    try {
      const boardColumns = appState.columns.filter(col => col.boardId === boardId);
      
      const response = await authenticatedFetch('/api/columns', {
        method: 'POST',
        body: JSON.stringify({
          boardId,
          title: form.title,
          order: boardColumns.length,
        }),
      });

      if (response.ok) {
        const newColumn: Column = await response.json();
        setAppState(prev => ({
          ...prev,
          columns: [...prev.columns, newColumn],
        }));
        return newColumn;
      } else {
        throw new Error('Failed to create column');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create column';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateColumn = async (id: string, updates: Partial<Pick<Column, 'title'>>) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/columns/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedColumn: Column = await response.json();
        setAppState(prev => ({
          ...prev,
          columns: prev.columns.map(column => 
            column.id === id ? updatedColumn : column
          ),
        }));
      } else {
        throw new Error('Failed to update column');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update column';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteColumn = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/columns/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppState(prev => ({
          ...prev,
          columns: prev.columns.filter(column => column.id !== id),
          cards: prev.cards.filter(card => card.columnId !== id),
        }));
      } else {
        throw new Error('Failed to delete column');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete column';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const reorderColumns = async (boardId: string, columnOrder: string[]) => {
    try {
      const response = await authenticatedFetch('/api/columns/reorder', {
        method: 'POST',
        body: JSON.stringify({ boardId, columnOrder }),
      });

      if (response.ok) {
        const updatedColumns: Column[] = await response.json();
        setAppState(prev => ({
          ...prev,
          columns: prev.columns.map(column => {
            const updated = updatedColumns.find(c => c.id === column.id);
            return updated || column;
          }),
        }));
      }
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  };

  // Card operations
  const createCard = async (columnId: string, form: CreateCardForm) => {
    const column = appState.columns.find(col => col.id === columnId);
    if (!column) return;

    setIsLoading(true);
    try {
      const columnCards = appState.cards.filter(card => card.columnId === columnId);
      
      const response = await authenticatedFetch('/api/cards', {
        method: 'POST',
        body: JSON.stringify({
          boardId: column.boardId,
          columnId,
          title: form.title,
          description: form.description || '',
          labels: form.labels || [],
          dueDate: form.dueDate || '',
          order: columnCards.length,
        }),
      });

      if (response.ok) {
        const newCard: Card = await response.json();
        setAppState(prev => ({
          ...prev,
          cards: [...prev.cards, newCard],
        }));
        return newCard;
      } else {
        throw new Error('Failed to create card');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create card';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCard = async (id: string, updates: Partial<EditCardForm>) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/cards/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const updatedCard: Card = await response.json();
        setAppState(prev => ({
          ...prev,
          cards: prev.cards.map(card => 
            card.id === id ? updatedCard : card
          ),
        }));
      } else {
        throw new Error('Failed to update card');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update card';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCard = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await authenticatedFetch(`/api/cards/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAppState(prev => ({
          ...prev,
          cards: prev.cards.filter(card => card.id !== id),
        }));

        // If we're currently viewing this card, close the modal
        if (uiState.selectedCardId === id) {
          setUIState(prev => ({
            ...prev,
            selectedCardId: null,
          }));
        }
      } else {
        throw new Error('Failed to delete card');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete card';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const moveCard = async (cardId: string, newColumnId: string, newOrder: number) => {
    try {
      const response = await authenticatedFetch(`/api/cards/${cardId}/move`, {
        method: 'POST',
        body: JSON.stringify({ columnId: newColumnId, order: newOrder }),
      });

      if (response.ok) {
        const updatedCard: Card = await response.json();
        setAppState(prev => ({
          ...prev,
          cards: prev.cards.map(card => 
            card.id === cardId ? updatedCard : card
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to move card:', error);
    }
  };

  // UI state management
  const setCurrentView = (view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  };

  const setSelectedBoard = (boardId: string | null) => {
    setUIState(prev => ({
      ...prev,
      selectedBoardId: boardId,
      currentView: boardId ? 'board' : 'boards',
      selectedCardId: null,
    }));
  };

  const setSelectedCard = (cardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: cardId }));
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  // Computed values
  const selectedBoard = appState.boards.find(board => board.id === uiState.selectedBoardId);
  const boardColumns = appState.columns
    .filter(column => column.boardId === uiState.selectedBoardId)
    .sort((a, b) => a.order - b.order);
  
  const boardCards = appState.cards.filter(card => card.boardId === uiState.selectedBoardId);
  const selectedCard = appState.cards.find(card => card.id === uiState.selectedCardId);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,
    
    // Auth
    login,
    signUp,
    logout,
    
    // Boards
    createBoard,
    updateBoard,
    deleteBoard,
    
    // Columns
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    
    // Cards
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    
    // UI
    setCurrentView,
    setSelectedBoard,
    setSelectedCard,
    setAuthMode,
    clearError,
    
    // Computed
    selectedBoard,
    boardColumns,
    boardCards,
    selectedCard,
  };
};

// Export default
export default useTaskly;