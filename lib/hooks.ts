'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { 
  AppState, 
  Board, 
  Column, 
  Card, 
  UIState, 
  User, 
  AuthResponse,
  LoginCredentials,
  SignUpCredentials,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  DragData,
  ViewMode
} from '@/types';
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
  deleteCard as cosmicDeleteCard
} from '@/lib/cosmic';

// Auth API functions
const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    return response.json();
  },

  signup: async (credentials: SignUpCredentials): Promise<AuthResponse> => {
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign up failed');
    }

    return response.json();
  },

  verify: async (token: string): Promise<{ user: User }> => {
    const response = await fetch('/api/auth/verify', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return response.json();
  },
};

// Storage utilities
const storage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('taskly_token');
  },

  setToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('taskly_token', token);
  },

  removeToken: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('taskly_token');
  },
};

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

// Main hook
export function useTaskly() {
  // Core state
  const [appState, setAppState] = useState<AppState>(initialAppState);
  const [uiState, setUIState] = useState<UIState>(initialUIState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Drag state
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [draggedColumn, setDraggedColumn] = useState<Column | null>(null);

  // Clear error helper
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize app - check for saved auth token
  useEffect(() => {
    const initializeApp = async () => {
      const token = storage.getToken();
      if (token) {
        try {
          const { user } = await authAPI.verify(token);
          setAppState(prev => ({ ...prev, user }));
          setUIState(prev => ({ ...prev, currentView: 'boards' }));
        } catch (error) {
          // Invalid token, remove it
          storage.removeToken();
          console.error('Token verification failed:', error);
        }
      }
      setIsInitialized(true);
    };

    initializeApp();
  }, []);

  // Load user boards when user changes or boards view is selected
  useEffect(() => {
    const loadBoards = async () => {
      if (!appState.user || uiState.currentView !== 'boards') return;

      try {
        setIsLoading(true);
        const boards = await getUserBoards(appState.user.id);
        setAppState(prev => ({ ...prev, boards }));
      } catch (error) {
        console.error('Failed to load boards:', error);
        setError('Failed to load boards');
      } finally {
        setIsLoading(false);
      }
    };

    loadBoards();
  }, [appState.user, uiState.currentView]);

  // Load board data when a specific board is selected
  useEffect(() => {
    const loadBoardData = async () => {
      if (!uiState.selectedBoardId || uiState.currentView !== 'board') return;

      try {
        setIsLoading(true);
        const [columns, cards] = await Promise.all([
          getBoardColumns(uiState.selectedBoardId),
          getBoardCards(uiState.selectedBoardId),
        ]);

        setAppState(prev => ({
          ...prev,
          columns: columns.sort((a, b) => a.order - b.order),
          cards: cards.filter(card => !card.isArchived).sort((a, b) => a.order - b.order),
        }));
      } catch (error) {
        console.error('Failed to load board data:', error);
        setError('Failed to load board data');
      } finally {
        setIsLoading(false);
      }
    };

    loadBoardData();
  }, [uiState.selectedBoardId, uiState.currentView]);

  // Authentication functions
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authResponse = await authAPI.login(credentials);
      
      // Save token and update state
      storage.setToken(authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const authResponse = await authAPI.signup(credentials);
      
      // Save token and update state
      storage.setToken(authResponse.token);
      setAppState(prev => ({ ...prev, user: authResponse.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    storage.removeToken();
    setAppState(initialAppState);
    setUIState({ ...initialUIState, currentView: 'auth' });
  }, []);

  // UI state functions
  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
  }, []);

  const showBoardsView = useCallback(() => {
    setUIState(prev => ({
      ...prev,
      currentView: 'boards',
      selectedBoardId: null,
      selectedCardId: null,
    }));
  }, []);

  const showBoardView = useCallback((boardId: string) => {
    setUIState(prev => ({
      ...prev,
      currentView: 'board',
      selectedBoardId: boardId,
      selectedCardId: null,
    }));
  }, []);

  const showCardView = useCallback((cardId: string) => {
    setUIState(prev => ({
      ...prev,
      currentView: 'card',
      selectedCardId: cardId,
    }));
  }, []);

  // Board operations
  const createBoard = useCallback(async (form: CreateBoardForm) => {
    if (!appState.user) throw new Error('User not authenticated');

    try {
      setIsLoading(true);
      const order = Math.max(...appState.boards.map(b => b.order), 0) + 1;
      const newBoard = await cosmicCreateBoard(form.title, appState.user.id, order);
      
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, newBoard].sort((a, b) => a.order - b.order),
      }));
      
      return newBoard;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create board';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [appState.user, appState.boards]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => {
    try {
      await cosmicUpdateBoard(id, updates);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board =>
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update board';
      setError(message);
      throw error;
    }
  }, []);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      await cosmicDeleteBoard(id);
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete board';
      setError(message);
      throw error;
    }
  }, []);

  const reorderBoards = useCallback(async (activeId: string, overId: string) => {
    const boards = [...appState.boards];
    const activeIndex = boards.findIndex(board => board.id === activeId);
    const overIndex = boards.findIndex(board => board.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const reorderedBoards = arrayMove(boards, activeIndex, overIndex);
    
    // Update order values
    const updatedBoards = reorderedBoards.map((board, index) => ({
      ...board,
      order: index,
    }));

    // Optimistically update UI
    setAppState(prev => ({ ...prev, boards: updatedBoards }));

    // Update each board's order in the backend
    try {
      await Promise.all(
        updatedBoards.map(board =>
          cosmicUpdateBoard(board.id, { order: board.order })
        )
      );
    } catch (error) {
      // Revert on error
      setAppState(prev => ({ ...prev, boards }));
      const message = error instanceof Error ? error.message : 'Failed to reorder boards';
      setError(message);
    }
  }, [appState.boards]);

  // Column operations
  const createColumn = useCallback(async (form: CreateColumnForm) => {
    if (!uiState.selectedBoardId) throw new Error('No board selected');

    try {
      const order = Math.max(...appState.columns.map(c => c.order), 0) + 1;
      const newColumn = await cosmicCreateColumn(uiState.selectedBoardId, form.title, order);
      
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, newColumn].sort((a, b) => a.order - b.order),
      }));
      
      return newColumn;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create column';
      setError(message);
      throw error;
    }
  }, [uiState.selectedBoardId, appState.columns]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Pick<Column, 'title'>>) => {
    try {
      await cosmicUpdateColumn(id, updates);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column =>
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update column';
      setError(message);
      throw error;
    }
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      await cosmicDeleteColumn(id);
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete column';
      setError(message);
      throw error;
    }
  }, []);

  const reorderColumns = useCallback(async (activeId: string, overId: string) => {
    const columns = [...appState.columns];
    const activeIndex = columns.findIndex(column => column.id === activeId);
    const overIndex = columns.findIndex(column => column.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const reorderedColumns = arrayMove(columns, activeIndex, overIndex);
    
    // Update order values
    const updatedColumns = reorderedColumns.map((column, index) => ({
      ...column,
      order: index,
    }));

    // Optimistically update UI
    setAppState(prev => ({ ...prev, columns: updatedColumns }));

    // Update each column's order in the backend
    try {
      await Promise.all(
        updatedColumns.map(column =>
          cosmicUpdateColumn(column.id, { order: column.order })
        )
      );
    } catch (error) {
      // Revert on error
      setAppState(prev => ({ ...prev, columns }));
      const message = error instanceof Error ? error.message : 'Failed to reorder columns';
      setError(message);
    }
  }, [appState.columns]);

  // Card operations
  const createCard = useCallback(async (form: CreateCardForm & { columnId: string }) => {
    try {
      if (!uiState.selectedBoardId) throw new Error('No board selected');

      const columnCards = appState.cards.filter(card => card.columnId === form.columnId);
      const order = Math.max(...columnCards.map(c => c.order), 0) + 1;
      
      const newCard = await cosmicCreateCard(
        uiState.selectedBoardId,
        form.columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        order
      );
      
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, newCard].sort((a, b) => a.order - b.order),
      }));
      
      return newCard;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create card';
      setError(message);
      throw error;
    }
  }, [uiState.selectedBoardId, appState.cards]);

  const updateCard = useCallback(async (id: string, updates: Partial<EditCardForm>) => {
    try {
      // Remove id from updates as it's not needed for the API
      const { id: _, ...updateData } = updates;
      await cosmicUpdateCard(id, updateData);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === id ? { ...card, ...updateData } : card
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update card';
      setError(message);
      throw error;
    }
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    try {
      await cosmicDeleteCard(id);
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete card';
      setError(message);
      throw error;
    }
  }, []);

  const moveCard = useCallback(async (cardId: string, targetColumnId: string, targetOrder: number) => {
    try {
      await cosmicUpdateCard(cardId, { 
        columnId: targetColumnId, 
        order: targetOrder 
      });
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card =>
          card.id === cardId 
            ? { ...card, columnId: targetColumnId, order: targetOrder }
            : card
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move card';
      setError(message);
      throw error;
    }
  }, []);

  const reorderCards = useCallback(async (activeId: string, overId: string, columnId: string) => {
    const columnCards = appState.cards.filter(card => card.columnId === columnId);
    const activeIndex = columnCards.findIndex(card => card.id === activeId);
    const overIndex = columnCards.findIndex(card => card.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    const reorderedCards = arrayMove(columnCards, activeIndex, overIndex);
    
    // Update order values
    const updatedCards = reorderedCards.map((card, index) => ({
      ...card,
      order: index,
    }));

    // Update all cards in the state
    const allUpdatedCards = appState.cards.map(card => {
      const updatedCard = updatedCards.find(uc => uc.id === card.id);
      return updatedCard || card;
    });

    // Optimistically update UI
    setAppState(prev => ({ ...prev, cards: allUpdatedCards }));

    // Update each card's order in the backend
    try {
      await Promise.all(
        updatedCards.map(card =>
          cosmicUpdateCard(card.id, { order: card.order })
        )
      );
    } catch (error) {
      // Revert on error
      setAppState(prev => ({ ...prev, cards: appState.cards }));
      const message = error instanceof Error ? error.message : 'Failed to reorder cards';
      setError(message);
    }
  }, [appState.cards]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const data = active.data.current as DragData | undefined;

    if (data?.type === 'card') {
      setDraggedCard(data.card);
    } else if (data?.type === 'column') {
      setDraggedColumn(data.column);
    }
  }, []);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear dragged items
    setDraggedCard(null);
    setDraggedColumn(null);

    if (!over || active.id === over.id) return;

    const activeData = active.data.current as DragData | undefined;
    const overData = over.data.current as DragData | undefined;

    // Handle different drag scenarios
    if (activeData?.type === 'card' && overData?.type === 'card') {
      // Card to card - reorder within same column
      const activeCard = activeData.card;
      const overCard = overData.card;
      
      if (activeCard.columnId === overCard.columnId) {
        await reorderCards(activeCard.id, overCard.id, activeCard.columnId);
      }
    } else if (activeData?.type === 'card' && overData?.type === 'column-cards') {
      // Card to column - move to different column
      const activeCard = activeData.card;
      const targetColumnId = overData.columnId;
      
      if (activeCard.columnId !== targetColumnId) {
        const targetColumnCards = appState.cards.filter(card => card.columnId === targetColumnId);
        const newOrder = Math.max(...targetColumnCards.map(c => c.order), 0) + 1;
        
        await moveCard(activeCard.id, targetColumnId, newOrder);
      }
    } else if (activeData?.type === 'column' && overData?.type === 'column') {
      // Column to column - reorder columns
      await reorderColumns(active.id as string, over.id as string);
    }
  }, [appState.cards, reorderCards, moveCard, reorderColumns]);

  // Computed values
  const selectedBoard = useMemo(() => {
    return uiState.selectedBoardId 
      ? appState.boards.find(board => board.id === uiState.selectedBoardId) || null
      : null;
  }, [appState.boards, uiState.selectedBoardId]);

  const selectedCard = useMemo(() => {
    return uiState.selectedCardId 
      ? appState.cards.find(card => card.id === uiState.selectedCardId) || null
      : null;
  }, [appState.cards, uiState.selectedCardId]);

  const boardColumns = useMemo(() => {
    return appState.columns
      .filter(column => column.boardId === uiState.selectedBoardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns, uiState.selectedBoardId]);

  const getColumnCards = useCallback((columnId: string) => {
    return appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  return {
    // State
    appState,
    uiState,
    isLoading,
    error,
    isInitialized,
    draggedCard,
    draggedColumn,

    // Computed
    selectedBoard,
    selectedCard,
    boardColumns,
    getColumnCards,

    // Auth functions
    login,
    signUp,
    logout,

    // UI functions
    setAuthMode,
    showBoardsView,
    showBoardView,
    showCardView,
    clearError,

    // Board functions
    createBoard,
    updateBoard,
    deleteBoard,
    reorderBoards,

    // Column functions
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,

    // Card functions
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    reorderCards,

    // Drag handlers
    handleDragStart,
    handleDragEnd,
  };
}