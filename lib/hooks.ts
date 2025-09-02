'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  AppState, 
  User, 
  Board, 
  Column, 
  Card, 
  AuthResponse, 
  LoginCredentials, 
  SignUpCredentials,
  UIState,
  ViewMode,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  DragEndEvent
} from '@/types';
import { 
  getUserByEmail,
  getUserBoards,
  createBoard,
  updateBoard,
  deleteBoard,
  getBoardColumns,
  createColumn,
  updateColumn,
  deleteColumn,
  getBoardCards,
  createCard,
  updateCard,
  deleteCard
} from '@/lib/cosmic';

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
  verifyAuth: () => Promise<void>;
  
  // UI methods
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (boardId: string | null) => void;
  setSelectedCardId: (cardId: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Board methods
  createBoard: (form: CreateBoardForm) => Promise<void>;
  updateBoard: (boardId: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;
  archiveBoard: (boardId: string) => Promise<void>;
  
  // Column methods
  createColumn: (boardId: string, form: CreateColumnForm) => Promise<void>;
  updateColumn: (columnId: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
  
  // Card methods
  createCard: (columnId: string, form: CreateCardForm) => Promise<void>;
  updateCard: (cardId: string, updates: EditCardForm) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveCard: (cardId: string, newColumnId: string, newOrder: number) => Promise<void>;
  archiveCard: (cardId: string) => Promise<void>;
  
  // Data loading
  loadBoardData: (boardId: string) => Promise<void>;
  loadUserBoards: () => Promise<void>;
  
  // Drag and drop
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
}

const TasklyContext = createContext<TasklyContextType | null>(null);

const INITIAL_APP_STATE: AppState = {
  boards: [],
  columns: [],
  cards: [],
  user: null,
};

const INITIAL_UI_STATE: UIState = {
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

export function TasklyProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useState<AppState>(INITIAL_APP_STATE);
  const [uiState, setUIState] = useState<UIState>(INITIAL_UI_STATE);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to handle API errors
  const handleError = useCallback((error: any, defaultMessage: string) => {
    console.error(defaultMessage, error);
    if (error?.message) {
      setError(error.message);
    } else if (typeof error === 'string') {
      setError(error);
    } else {
      setError(defaultMessage);
    }
  }, []);

  // Helper function to store auth token
  const storeAuthToken = useCallback((token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('taskly_token', token);
    }
  }, []);

  // Helper function to get auth token
  const getAuthToken = useCallback((): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('taskly_token');
    }
    return null;
  }, []);

  // Helper function to clear auth token
  const clearAuthToken = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('taskly_token');
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
      
      const authResponse: AuthResponse = data;
      storeAuthToken(authResponse.token);
      
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user boards after successful login
      await loadUserBoards();
    } catch (error) {
      handleError(error, 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, storeAuthToken]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setIsLoading(true);
    setError(null);
    
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
      
      const authResponse: AuthResponse = data;
      storeAuthToken(authResponse.token);
      
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user boards after successful signup
      await loadUserBoards();
    } catch (error) {
      handleError(error, 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, storeAuthToken]);

  const logout = useCallback(() => {
    clearAuthToken();
    setAppState(INITIAL_APP_STATE);
    setUIState(INITIAL_UI_STATE);
    setError(null);
  }, [clearAuthToken]);

  const verifyAuth = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUIState(prev => ({ ...prev, currentView: 'auth' }));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      
      const { user } = await response.json();
      setAppState(prev => ({ ...prev, user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      // Load user boards after successful verification
      await loadUserBoards();
    } catch (error) {
      console.error('Auth verification failed:', error);
      clearAuthToken();
      setUIState(prev => ({ ...prev, currentView: 'auth' }));
    } finally {
      setIsLoading(false);
    }
  }, [getAuthToken, clearAuthToken]);

  // UI methods
  const setCurrentView = useCallback((view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  }, []);

  const setSelectedBoardId = useCallback((boardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedBoardId: boardId }));
  }, []);

  const setSelectedCardId = useCallback((cardId: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: cardId }));
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Data loading methods
  const loadUserBoards = useCallback(async () => {
    if (!appState.user) return;
    
    setIsLoading(true);
    
    try {
      const boards = await getUserBoards(appState.user.id);
      setAppState(prev => ({ ...prev, boards }));
    } catch (error) {
      handleError(error, 'Failed to load boards');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, handleError]);

  const loadBoardData = useCallback(async (boardId: string) => {
    setIsLoading(true);
    
    try {
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId),
      ]);
      
      setAppState(prev => ({ ...prev, columns, cards }));
      setUIState(prev => ({ ...prev, selectedBoardId: boardId, currentView: 'board' }));
    } catch (error) {
      handleError(error, 'Failed to load board data');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Board methods
  const createBoardMethod = useCallback(async (form: CreateBoardForm) => {
    if (!appState.user) {
      setError('User not authenticated');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newBoard = await createBoard(
        form.title,
        appState.user.id,
        appState.boards.length
      );
      
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, newBoard],
      }));
    } catch (error) {
      handleError(error, 'Failed to create board');
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, appState.boards.length, handleError]);

  const updateBoardMethod = useCallback(async (
    boardId: string, 
    updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateBoard(boardId, updates);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board =>
          board.id === boardId ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      handleError(error, 'Failed to update board');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteBoardMethod = useCallback(async (boardId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteBoard(boardId);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== boardId),
        columns: prev.columns.filter(column => column.boardId !== boardId),
        cards: prev.cards.filter(card => card.boardId !== boardId),
      }));
      
      // If this was the selected board, go back to boards view
      if (uiState.selectedBoardId === boardId) {
        setUIState(prev => ({
          ...prev,
          selectedBoardId: null,
          currentView: 'boards',
        }));
      }
    } catch (error) {
      handleError(error, 'Failed to delete board');
    } finally {
      setIsLoading(false);
    }
  }, [handleError, uiState.selectedBoardId]);

  const archiveBoard = useCallback(async (boardId: string) => {
    await updateBoardMethod(boardId, { isArchived: true });
  }, [updateBoardMethod]);

  // Column methods
  const createColumnMethod = useCallback(async (boardId: string, form: CreateColumnForm) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const boardColumns = appState.columns.filter(col => col.boardId === boardId);
      const newColumn = await createColumn(boardId, form.title, boardColumns.length);
      
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, newColumn],
      }));
    } catch (error) {
      handleError(error, 'Failed to create column');
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns, handleError]);

  const updateColumnMethod = useCallback(async (
    columnId: string, 
    updates: Partial<Pick<Column, 'title' | 'order'>>
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateColumn(columnId, updates);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column =>
          column.id === columnId ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      handleError(error, 'Failed to update column');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteColumnMethod = useCallback(async (columnId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteColumn(columnId);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== columnId),
        cards: prev.cards.filter(card => card.columnId !== columnId),
      }));
    } catch (error) {
      handleError(error, 'Failed to delete column');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const reorderColumns = useCallback(async (boardId: string, columnIds: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Update column orders
      const updatePromises = columnIds.map((columnId, index) =>
        updateColumn(columnId, { order: index })
      );
      
      await Promise.all(updatePromises);
      
      // Update local state
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => {
          const newIndex = columnIds.indexOf(column.id);
          return newIndex !== -1 ? { ...column, order: newIndex } : column;
        }),
      }));
    } catch (error) {
      handleError(error, 'Failed to reorder columns');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  // Card methods
  const createCardMethod = useCallback(async (columnId: string, form: CreateCardForm) => {
    const column = appState.columns.find(col => col.id === columnId);
    if (!column) {
      setError('Column not found');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const columnCards = appState.cards.filter(card => card.columnId === columnId);
      const newCard = await createCard(
        column.boardId,
        columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        columnCards.length
      );
      
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, newCard],
      }));
    } catch (error) {
      handleError(error, 'Failed to create card');
    } finally {
      setIsLoading(false);
    }
  }, [appState.columns, appState.cards, handleError]);

  const updateCardMethod = useCallback(async (cardId: string, updates: EditCardForm) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateCard(cardId, updates);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      handleError(error, 'Failed to update card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const deleteCardMethod = useCallback(async (cardId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await deleteCard(cardId);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== cardId),
      }));
    } catch (error) {
      handleError(error, 'Failed to delete card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const moveCard = useCallback(async (cardId: string, newColumnId: string, newOrder: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateCard(cardId, { columnId: newColumnId, order: newOrder });
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId ? { ...card, columnId: newColumnId, order: newOrder } : card
        ),
      }));
    } catch (error) {
      handleError(error, 'Failed to move card');
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const archiveCard = useCallback(async (cardId: string) => {
    await updateCardMethod(cardId, { id: cardId, title: '', isArchived: true });
  }, [updateCardMethod]);

  // Drag and drop handler
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !active.data.current) return;
    
    const activeData = active.data.current;
    const overData = over.data.current;
    
    // Handle card drag
    if (activeData.type === 'card') {
      const card = activeData.card as Card;
      
      // Dragging to a column
      if (overData?.type === 'column') {
        const targetColumn = overData.column as Column;
        if (card.columnId !== targetColumn.id) {
          await moveCard(card.id, targetColumn.id, 0);
        }
      }
      // Dragging to another card
      else if (overData?.type === 'card') {
        const targetCard = overData.card as Card;
        if (card.columnId !== targetCard.columnId) {
          await moveCard(card.id, targetCard.columnId, targetCard.order);
        }
      }
    }
    
    // Handle column drag (reordering)
    if (activeData.type === 'column' && overData?.type === 'column') {
      const activeColumn = activeData.column as Column;
      const overColumn = overData.column as Column;
      
      if (activeColumn.boardId === overColumn.boardId) {
        const boardColumns = appState.columns
          .filter(col => col.boardId === activeColumn.boardId)
          .sort((a, b) => a.order - b.order);
        
        const activeIndex = boardColumns.findIndex(col => col.id === activeColumn.id);
        const overIndex = boardColumns.findIndex(col => col.id === overColumn.id);
        
        if (activeIndex !== overIndex) {
          const reorderedColumns = [...boardColumns];
          const [movedColumn] = reorderedColumns.splice(activeIndex, 1);
          reorderedColumns.splice(overIndex, 0, movedColumn);
          
          const columnIds = reorderedColumns.map(col => col.id);
          await reorderColumns(activeColumn.boardId, columnIds);
        }
      }
    }
  }, [appState.columns, moveCard, reorderColumns]);

  // Initialize auth on mount
  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  const contextValue: TasklyContextType = {
    // State
    appState,
    uiState,
    isLoading,
    error,
    
    // Auth methods
    login,
    signUp,
    logout,
    verifyAuth,
    
    // UI methods
    setCurrentView,
    setSelectedBoardId,
    setSelectedCardId,
    setAuthMode,
    clearError,
    
    // Board methods
    createBoard: createBoardMethod,
    updateBoard: updateBoardMethod,
    deleteBoard: deleteBoardMethod,
    archiveBoard,
    
    // Column methods
    createColumn: createColumnMethod,
    updateColumn: updateColumnMethod,
    deleteColumn: deleteColumnMethod,
    reorderColumns,
    
    // Card methods
    createCard: createCardMethod,
    updateCard: updateCardMethod,
    deleteCard: deleteCardMethod,
    moveCard,
    archiveCard,
    
    // Data loading
    loadBoardData,
    loadUserBoards,
    
    // Drag and drop
    handleDragEnd,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
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