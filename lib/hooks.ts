'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  KeyboardSensor,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { coordinateGetter } from '@dnd-kit/utilities';

import type {
  User,
  Board,
  Column,
  Card,
  AppState,
  UIState,
  ViewMode,
  LoginCredentials,
  SignUpCredentials,
  AuthResponse,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  DragData
} from '@/types';

// Storage service interface
interface StorageService {
  loadData(): Promise<AppState>;
  saveData(data: AppState): Promise<void>;
  clearData(): void;
}

// Local storage implementation
const localStorage: StorageService = {
  loadData: async (): Promise<AppState> => {
    if (typeof window === 'undefined') {
      return { boards: [], columns: [], cards: [], user: null };
    }
    
    const stored = window.localStorage.getItem('taskly-data');
    if (!stored) {
      return { boards: [], columns: [], cards: [], user: null };
    }
    
    try {
      const parsed = JSON.parse(stored);
      return {
        boards: parsed.boards || [],
        columns: parsed.columns || [],
        cards: parsed.cards || [],
        user: parsed.user || null,
      };
    } catch (error) {
      console.error('Error parsing stored data:', error);
      return { boards: [], columns: [], cards: [], user: null };
    }
  },
  
  saveData: async (data: AppState): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    try {
      window.localStorage.setItem('taskly-data', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  },
  
  clearData: (): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('taskly-data');
    window.localStorage.removeItem('taskly-auth-token');
  }
};

// Authentication token management
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('taskly-auth-token');
};

const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('taskly-auth-token', token);
};

const removeAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('taskly-auth-token');
};

// API helper functions
const apiRequest = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const token = getAuthToken();
  
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };
  
  const response = await fetch(endpoint, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

// Custom hook for managing Taskly application state
export function useTaskly() {
  // Core state
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });
  
  // UI state
  const [uiState, setUIState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: coordinateGetter,
    })
  );

  // Initialize app
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        
        // Check for existing auth token and verify
        const token = getAuthToken();
        if (token) {
          try {
            const response = await apiRequest('/api/auth/verify');
            if (response.user) {
              setAppState(prev => ({ ...prev, user: response.user }));
              setUIState(prev => ({ ...prev, currentView: 'boards' }));
              await loadUserData();
            } else {
              removeAuthToken();
            }
          } catch (error) {
            console.error('Token verification failed:', error);
            removeAuthToken();
          }
        }
        
        // Load any cached data
        const cachedData = await localStorage.loadData();
        if (cachedData.user) {
          setAppState(prev => ({ ...prev, ...cachedData }));
        }
      } catch (error) {
        console.error('App initialization error:', error);
        setError('Failed to initialize app');
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    initializeApp();
  }, []);

  // Save data when state changes
  useEffect(() => {
    if (isInitialized) {
      localStorage.saveData(appState);
    }
  }, [appState, isInitialized]);

  // Load user-specific data from API
  const loadUserData = async () => {
    if (!appState.user) return;
    
    try {
      setIsLoading(true);
      
      // Load boards, columns, and cards from API
      const [boardsResponse, columnsResponse, cardsResponse] = await Promise.allSettled([
        apiRequest('/api/boards'),
        apiRequest('/api/columns'),
        apiRequest('/api/cards'),
      ]);
      
      const boards = boardsResponse.status === 'fulfilled' ? boardsResponse.value.boards : [];
      const columns = columnsResponse.status === 'fulfilled' ? columnsResponse.value.columns : [];
      const cards = cardsResponse.status === 'fulfilled' ? cardsResponse.value.cards : [];
      
      setAppState(prev => ({
        ...prev,
        boards,
        columns,
        cards,
      }));
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Authentication functions
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: AuthResponse = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      setAuthToken(response.token);
      setAppState(prev => ({ ...prev, user: response.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      await loadUserData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (credentials: SignUpCredentials): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate password confirmation
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      
      const response: AuthResponse = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });
      
      setAuthToken(response.token);
      setAppState(prev => ({ ...prev, user: response.user }));
      setUIState(prev => ({ ...prev, currentView: 'boards' }));
      
      await loadUserData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    removeAuthToken();
    localStorage.clearData();
    setAppState({ boards: [], columns: [], cards: [], user: null });
    setUIState({
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
    });
    setError(null);
  };

  // Board operations
  const createBoard = async (form: CreateBoardForm): Promise<void> => {
    if (!appState.user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/boards', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          userId: appState.user.id,
          order: appState.boards.length,
        }),
      });
      
      setAppState(prev => ({
        ...prev,
        boards: [...prev.boards, response.board],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create board';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateBoard = async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/boards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const deleteBoard = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/boards/${id}`, {
        method: 'DELETE',
      });
      
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));
      
      // Navigate away from deleted board
      if (uiState.selectedBoardId === id) {
        setUIState(prev => ({
          ...prev,
          currentView: 'boards',
          selectedBoardId: null,
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete board';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveBoard = async (id: string): Promise<void> => {
    await updateBoard(id, { isArchived: true });
  };

  const restoreBoard = async (id: string): Promise<void> => {
    await updateBoard(id, { isArchived: false });
  };

  // Column operations
  const createColumn = async (boardId: string, form: CreateColumnForm): Promise<void> => {
    try {
      setIsLoading(true);
      const boardColumns = appState.columns.filter(col => col.boardId === boardId);
      const response = await apiRequest('/api/columns', {
        method: 'POST',
        body: JSON.stringify({
          boardId,
          title: form.title,
          order: boardColumns.length,
        }),
      });
      
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, response.column],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create column';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateColumn = async (id: string, updates: Partial<Pick<Column, 'title'>>): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/columns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const deleteColumn = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/columns/${id}`, {
        method: 'DELETE',
      });
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete column';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const reorderColumns = async (boardId: string, columnOrders: Array<{ id: string; order: number }>): Promise<void> => {
    try {
      await apiRequest('/api/columns/reorder', {
        method: 'PUT',
        body: JSON.stringify({ columnOrders }),
      });
      
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => {
          const orderUpdate = columnOrders.find(update => update.id === column.id);
          return orderUpdate ? { ...column, order: orderUpdate.order } : column;
        }),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reorder columns';
      setError(message);
      throw error;
    }
  };

  // Card operations
  const createCard = async (columnId: string, form: CreateCardForm): Promise<void> => {
    const column = appState.columns.find(col => col.id === columnId);
    if (!column) throw new Error('Column not found');
    
    try {
      setIsLoading(true);
      const columnCards = appState.cards.filter(card => card.columnId === columnId);
      const response = await apiRequest('/api/cards', {
        method: 'POST',
        body: JSON.stringify({
          boardId: column.boardId,
          columnId,
          title: form.title,
          description: form.description,
          labels: form.labels,
          dueDate: form.dueDate,
          order: columnCards.length,
        }),
      });
      
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, response.card],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create card';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCard = async (id: string, updates: Partial<EditCardForm>): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update card';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const moveCard = async (cardId: string, targetColumnId: string, targetOrder: number): Promise<void> => {
    try {
      await apiRequest(`/api/cards/${cardId}/move`, {
        method: 'PUT',
        body: JSON.stringify({
          columnId: targetColumnId,
          order: targetOrder,
        }),
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
  };

  const deleteCard = async (id: string): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest(`/api/cards/${id}`, {
        method: 'DELETE',
      });
      
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
      
      // Close card modal if this card was selected
      if (uiState.selectedCardId === id) {
        setUIState(prev => ({ ...prev, selectedCardId: null }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete card';
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const archiveCard = async (id: string): Promise<void> => {
    await updateCard(id, { isArchived: true });
  };

  const restoreCard = async (id: string): Promise<void> => {
    await updateCard(id, { isArchived: false });
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current as DragData | undefined;
    
    if (activeData) {
      setDraggedItem(activeData);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || !draggedItem) {
      setDraggedItem(null);
      return;
    }
    
    try {
      if (draggedItem.type === 'card') {
        const card = draggedItem.card;
        const overId = over.id as string;
        const overData = over.data.current as DragData | undefined;
        
        // Moving card to different column
        if (overData?.type === 'column' || overData?.type === 'column-cards') {
          const targetColumnId = overData.type === 'column' 
            ? overData.column.id 
            : overData.columnId;
          
          if (card.columnId !== targetColumnId) {
            const targetColumnCards = appState.cards
              .filter(c => c.columnId === targetColumnId && !c.isArchived)
              .sort((a, b) => a.order - b.order);
            
            await moveCard(card.id, targetColumnId, targetColumnCards.length);
          }
        }
        // Reordering within same column
        else if (overData?.type === 'card') {
          const targetCard = overData.card;
          if (card.id !== targetCard.id && card.columnId === targetCard.columnId) {
            const columnCards = appState.cards
              .filter(c => c.columnId === card.columnId && !c.isArchived)
              .sort((a, b) => a.order - b.order);
            
            const oldIndex = columnCards.findIndex(c => c.id === card.id);
            const newIndex = columnCards.findIndex(c => c.id === targetCard.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
              const newOrder = columnCards[newIndex]?.order ?? 0;
              await moveCard(card.id, card.columnId, newOrder);
            }
          }
        }
      }
      // Column reordering
      else if (draggedItem.type === 'column') {
        const column = draggedItem.column;
        const overData = over.data.current as DragData | undefined;
        
        if (overData?.type === 'column') {
          const targetColumn = overData.column;
          if (column.id !== targetColumn.id && column.boardId === targetColumn.boardId) {
            const boardColumns = appState.columns
              .filter(c => c.boardId === column.boardId)
              .sort((a, b) => a.order - b.order);
            
            const oldIndex = boardColumns.findIndex(c => c.id === column.id);
            const newIndex = boardColumns.findIndex(c => c.id === targetColumn.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
              const reorderedColumns = arrayMove(boardColumns, oldIndex, newIndex);
              const columnOrders = reorderedColumns.map((col, index) => ({
                id: col.id,
                order: index,
              }));
              
              await reorderColumns(column.boardId, columnOrders);
            }
          }
        }
      }
    } catch (error) {
      console.error('Drag operation failed:', error);
      const message = error instanceof Error ? error.message : 'Drag operation failed';
      setError(message);
    } finally {
      setDraggedItem(null);
    }
  };

  // UI state management
  const setCurrentView = (view: ViewMode) => {
    setUIState(prev => ({ ...prev, currentView: view }));
  };

  const setSelectedBoardId = (id: string | null) => {
    setUIState(prev => ({ ...prev, selectedBoardId: id }));
  };

  const setSelectedCardId = (id: string | null) => {
    setUIState(prev => ({ ...prev, selectedCardId: id }));
  };

  const setAuthMode = (mode: 'login' | 'signup') => {
    setUIState(prev => ({ ...prev, authMode: mode }));
  };

  const navigateToBoard = (boardId: string) => {
    setUIState(prev => ({
      ...prev,
      currentView: 'board',
      selectedBoardId: boardId,
    }));
  };

  const navigateToBoards = () => {
    setUIState(prev => ({
      ...prev,
      currentView: 'boards',
      selectedBoardId: null,
    }));
  };

  const openCardModal = (cardId: string) => {
    setUIState(prev => ({
      ...prev,
      selectedCardId: cardId,
    }));
  };

  const closeCardModal = () => {
    setUIState(prev => ({
      ...prev,
      selectedCardId: null,
    }));
  };

  // Error management
  const clearError = () => {
    setError(null);
  };

  // Computed values
  const activeBoards = useMemo(() => {
    return appState.boards.filter(board => !board.isArchived);
  }, [appState.boards]);

  const archivedBoards = useMemo(() => {
    return appState.boards.filter(board => board.isArchived);
  }, [appState.boards]);

  const selectedBoard = useMemo(() => {
    return uiState.selectedBoardId 
      ? appState.boards.find(board => board.id === uiState.selectedBoardId) 
      : undefined;
  }, [appState.boards, uiState.selectedBoardId]);

  const selectedCard = useMemo(() => {
    return uiState.selectedCardId 
      ? appState.cards.find(card => card.id === uiState.selectedCardId) 
      : undefined;
  }, [appState.cards, uiState.selectedCardId]);

  const boardColumns = useMemo(() => {
    if (!uiState.selectedBoardId) return [];
    return appState.columns
      .filter(column => column.boardId === uiState.selectedBoardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns, uiState.selectedBoardId]);

  const getColumnCards = useCallback((columnId: string) => {
    return appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  const getBoardCards = useCallback((boardId: string) => {
    return appState.cards
      .filter(card => card.boardId === boardId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  // Return the complete API
  return {
    // State
    appState,
    uiState,
    isLoading,
    error,
    isInitialized,
    draggedItem,
    
    // Authentication
    login,
    signUp,
    logout,
    
    // Board operations
    createBoard,
    updateBoard,
    deleteBoard,
    archiveBoard,
    restoreBoard,
    
    // Column operations
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
    
    // Card operations
    createCard,
    updateCard,
    deleteCard,
    archiveCard,
    restoreCard,
    moveCard,
    
    // Drag and drop
    handleDragStart,
    handleDragEnd,
    sensors,
    
    // UI navigation
    setCurrentView,
    setSelectedBoardId,
    setSelectedCardId,
    setAuthMode,
    navigateToBoard,
    navigateToBoards,
    openCardModal,
    closeCardModal,
    
    // Utilities
    clearError,
    
    // Computed values
    activeBoards,
    archivedBoards,
    selectedBoard,
    selectedCard,
    boardColumns,
    getColumnCards,
    getBoardCards,
  };
}

// Context provider component
import { createContext, useContext, ReactNode } from 'react';

const TasklyContext = createContext<ReturnType<typeof useTaskly> | null>(null);

export const TasklyProvider = ({ children }: { children: ReactNode }) => {
  const taskly = useTaskly();
  
  return (
    <TasklyContext.Provider value={taskly}>
      <DndContext
        sensors={taskly.sensors}
        collisionDetection={closestCorners}
        onDragStart={taskly.handleDragStart}
        onDragEnd={taskly.handleDragEnd}
      >
        {children}
        <DragOverlay>
          {taskly.draggedItem?.type === 'card' && (
            <div className="opacity-80">
              {/* Card drag overlay component would go here */}
            </div>
          )}
          {taskly.draggedItem?.type === 'column' && (
            <div className="opacity-80">
              {/* Column drag overlay component would go here */}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </TasklyContext.Provider>
  );
};

export const useTasklyContext = () => {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTasklyContext must be used within a TasklyProvider');
  }
  return context;
};