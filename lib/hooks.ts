'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  AppState, 
  UIState, 
  User, 
  Board, 
  Column, 
  Card, 
  AuthResponse,
  LoginCredentials,
  SignUpCredentials,
  ViewMode,
  DragEndEvent,
  DragStartEvent,
  DragData 
} from '@/types';
import {
  getUserBoards,
  createBoard as createBoardApi,
  updateBoard as updateBoardApi,
  deleteBoard as deleteBoardApi,
  getBoardColumns,
  createColumn as createColumnApi,
  updateColumn as updateColumnApi,
  deleteColumn as deleteColumnApi,
  getBoardCards,
  createCard as createCardApi,
  updateCard as updateCardApi,
  deleteCard as deleteCardApi
} from '@/lib/cosmic';

// API functions for authentication
const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

const signUpUser = async (credentials: SignUpCredentials): Promise<AuthResponse> => {
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
    const error = await response.json();
    throw new Error(error.error || 'Sign up failed');
  }

  return response.json();
};

const verifyUserToken = async (token: string): Promise<User> => {
  const response = await fetch('/api/auth/verify', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token verification failed');
  }

  const data = await response.json();
  return data.user;
};

// Combined store interface
interface TasklyStore extends AppState, UIState {
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  
  // UI actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Board actions
  loadBoards: () => Promise<void>;
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  reorderBoards: (boardIds: string[]) => Promise<void>;
  
  // Board data loading
  loadBoardData: (boardId: string) => Promise<void>;
  
  // Column actions
  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title'>>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
  
  // Card actions
  createCard: (boardId: string, columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived'>>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, newColumnId: string, newPosition: number) => Promise<void>;
  reorderCards: (columnId: string, cardIds: string[]) => Promise<void>;
  
  // Drag and drop
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => Promise<void>;
  activeDragData: DragData | null;
  
  // Utility actions
  reset: () => void;
}

// Initial state
const initialState: AppState & UIState = {
  // App state
  boards: [],
  columns: [],
  cards: [],
  user: null,
  
  // UI state
  currentView: 'auth' as ViewMode,
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login' as 'login' | 'signup',
};

// Create the store
export const useTaskly = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,
      
      // Loading and error states
      isLoading: false,
      error: null,
      
      // Drag state
      activeDragData: null,
      
      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      // Auth actions
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const authResponse = await loginUser(credentials);
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false 
          });
          
          // Store token in localStorage
          localStorage.setItem('taskly_token', authResponse.token);
          
          // Load user's boards
          await get().loadBoards();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      signUp: async (credentials: SignUpCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const authResponse = await signUpUser(credentials);
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false 
          });
          
          // Store token in localStorage
          localStorage.setItem('taskly_token', authResponse.token);
          
          // Load user's boards (will be empty for new users)
          await get().loadBoards();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      logout: () => {
        // Clear token from localStorage
        localStorage.removeItem('taskly_token');
        
        // Reset to initial state
        set({
          ...initialState,
          isLoading: false,
          error: null,
          activeDragData: null,
        });
      },
      
      verifyAuth: async () => {
        const token = localStorage.getItem('taskly_token');
        if (!token) {
          set({ currentView: 'auth' });
          return;
        }
        
        try {
          set({ isLoading: true });
          const user = await verifyUserToken(token);
          
          set({ 
            user,
            currentView: 'boards',
            isLoading: false 
          });
          
          // Load user's boards
          await get().loadBoards();
        } catch (error) {
          // Token is invalid, clear it and show auth
          localStorage.removeItem('taskly_token');
          set({ 
            currentView: 'auth',
            isLoading: false 
          });
        }
      },
      
      // UI actions
      setCurrentView: (view: ViewMode) => {
        set({ currentView: view });
      },
      
      setSelectedBoardId: (id: string | null) => {
        set({ selectedBoardId: id });
      },
      
      setSelectedCardId: (id: string | null) => {
        set({ selectedCardId: id });
      },
      
      setAuthMode: (mode: 'login' | 'signup') => {
        set({ authMode: mode });
      },
      
      // Board actions
      loadBoards: async () => {
        const { user } = get();
        if (!user) return;
        
        try {
          set({ isLoading: true, error: null });
          
          const boards = await getUserBoards(user.id);
          
          set({ boards, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load boards';
          set({ error: errorMessage, isLoading: false });
        }
      },
      
      createBoard: async (title: string) => {
        const { user, boards } = get();
        if (!user) return;
        
        try {
          set({ isLoading: true, error: null });
          
          const maxOrder = boards.length > 0 ? Math.max(...boards.map(b => b.order)) : 0;
          const newBoard = await createBoardApi(title, user.id, maxOrder + 1);
          
          set({ 
            boards: [...boards, newBoard],
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create board';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      updateBoard: async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived'>>) => {
        const { boards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await updateBoardApi(id, updates);
          
          const updatedBoards = boards.map(board => 
            board.id === id ? { ...board, ...updates } : board
          );
          
          set({ 
            boards: updatedBoards,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update board';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      deleteBoard: async (id: string) => {
        const { boards, columns, cards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await deleteBoardApi(id);
          
          // Remove board and associated columns/cards
          const updatedBoards = boards.filter(board => board.id !== id);
          const updatedColumns = columns.filter(column => column.boardId !== id);
          const updatedCards = cards.filter(card => card.boardId !== id);
          
          set({ 
            boards: updatedBoards,
            columns: updatedColumns,
            cards: updatedCards,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete board';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      reorderBoards: async (boardIds: string[]) => {
        const { boards } = get();
        
        try {
          // Update local state immediately for better UX
          const reorderedBoards = boardIds.map((id, index) => {
            const board = boards.find(b => b.id === id);
            return board ? { ...board, order: index } : null;
          }).filter((board): board is Board => board !== null);
          
          set({ boards: reorderedBoards });
          
          // Update each board's order in the backend
          await Promise.all(
            reorderedBoards.map(board => 
              updateBoardApi(board.id, { order: board.order })
            )
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reorder boards';
          set({ error: errorMessage });
          // Reload boards to get correct order
          await get().loadBoards();
        }
      },
      
      // Board data loading
      loadBoardData: async (boardId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const [columns, cards] = await Promise.all([
            getBoardColumns(boardId),
            getBoardCards(boardId)
          ]);
          
          set({ 
            columns,
            cards,
            selectedBoardId: boardId,
            currentView: 'board',
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load board data';
          set({ error: errorMessage, isLoading: false });
        }
      },
      
      // Column actions
      createColumn: async (boardId: string, title: string) => {
        const { columns } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          const boardColumns = columns.filter(c => c.boardId === boardId);
          const maxOrder = boardColumns.length > 0 ? Math.max(...boardColumns.map(c => c.order)) : 0;
          
          const newColumn = await createColumnApi(boardId, title, maxOrder + 1);
          
          set({ 
            columns: [...columns, newColumn],
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create column';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      updateColumn: async (id: string, updates: Partial<Pick<Column, 'title'>>) => {
        const { columns } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await updateColumnApi(id, updates);
          
          const updatedColumns = columns.map(column => 
            column.id === id ? { ...column, ...updates } : column
          );
          
          set({ 
            columns: updatedColumns,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update column';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      deleteColumn: async (id: string) => {
        const { columns, cards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await deleteColumnApi(id);
          
          // Remove column and associated cards
          const updatedColumns = columns.filter(column => column.id !== id);
          const updatedCards = cards.filter(card => card.columnId !== id);
          
          set({ 
            columns: updatedColumns,
            cards: updatedCards,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete column';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      reorderColumns: async (boardId: string, columnIds: string[]) => {
        const { columns } = get();
        
        try {
          // Update local state immediately
          const updatedColumns = columns.map(column => {
            if (column.boardId === boardId) {
              const newOrder = columnIds.indexOf(column.id);
              return newOrder !== -1 ? { ...column, order: newOrder } : column;
            }
            return column;
          });
          
          set({ columns: updatedColumns });
          
          // Update backend
          const columnsToUpdate = updatedColumns.filter(c => 
            c.boardId === boardId && columnIds.includes(c.id)
          );
          
          await Promise.all(
            columnsToUpdate.map(column => 
              updateColumnApi(column.id, { order: column.order })
            )
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reorder columns';
          set({ error: errorMessage });
          // Reload board data to get correct order
          await get().loadBoardData(boardId);
        }
      },
      
      // Card actions
      createCard: async (boardId: string, columnId: string, title: string, description?: string) => {
        const { cards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          const columnCards = cards.filter(c => c.columnId === columnId);
          const maxOrder = columnCards.length > 0 ? Math.max(...columnCards.map(c => c.order)) : 0;
          
          const newCard = await createCardApi(
            boardId, 
            columnId, 
            title, 
            description, 
            undefined, 
            undefined, 
            maxOrder + 1
          );
          
          set({ 
            cards: [...cards, newCard],
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create card';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      updateCard: async (
        id: string, 
        updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived'>>
      ) => {
        const { cards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await updateCardApi(id, updates);
          
          const updatedCards = cards.map(card => 
            card.id === id ? { ...card, ...updates } : card
          );
          
          set({ 
            cards: updatedCards,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update card';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      deleteCard: async (id: string) => {
        const { cards } = get();
        
        try {
          set({ isLoading: true, error: null });
          
          await deleteCardApi(id);
          
          const updatedCards = cards.filter(card => card.id !== id);
          
          set({ 
            cards: updatedCards,
            isLoading: false 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete card';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },
      
      moveCard: async (cardId: string, newColumnId: string, newPosition: number) => {
        const { cards } = get();
        
        try {
          // Update local state immediately for better UX
          const card = cards.find(c => c.id === cardId);
          if (!card) return;
          
          const updatedCards = cards.map(c => {
            if (c.id === cardId) {
              return { ...c, columnId: newColumnId, order: newPosition };
            }
            // Update order of other cards in the target column
            if (c.columnId === newColumnId && c.order >= newPosition) {
              return { ...c, order: c.order + 1 };
            }
            return c;
          });
          
          set({ cards: updatedCards });
          
          // Update backend
          await updateCardApi(cardId, { 
            columnId: newColumnId, 
            order: newPosition 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to move card';
          set({ error: errorMessage });
          // Reload board data to get correct state
          const { selectedBoardId } = get();
          if (selectedBoardId) {
            await get().loadBoardData(selectedBoardId);
          }
        }
      },
      
      reorderCards: async (columnId: string, cardIds: string[]) => {
        const { cards } = get();
        
        try {
          // Update local state immediately
          const updatedCards = cards.map(card => {
            if (card.columnId === columnId) {
              const newOrder = cardIds.indexOf(card.id);
              return newOrder !== -1 ? { ...card, order: newOrder } : card;
            }
            return card;
          });
          
          set({ cards: updatedCards });
          
          // Update backend
          const cardsToUpdate = updatedCards.filter(c => 
            c.columnId === columnId && cardIds.includes(c.id)
          );
          
          await Promise.all(
            cardsToUpdate.map(card => 
              updateCardApi(card.id, { order: card.order })
            )
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reorder cards';
          set({ error: errorMessage });
          // Reload board data to get correct order
          const { selectedBoardId } = get();
          if (selectedBoardId) {
            await get().loadBoardData(selectedBoardId);
          }
        }
      },
      
      // Drag and drop handlers
      handleDragStart: (event: DragStartEvent) => {
        const { active } = event;
        const dragData = active.data?.current as DragData;
        
        set({ activeDragData: dragData });
      },
      
      handleDragEnd: async (event: DragEndEvent) => {
        const { active, over } = event;
        
        set({ activeDragData: null });
        
        if (!over) return;
        
        const activeData = active.data?.current as DragData;
        const overData = over.data?.current as DragData;
        
        if (!activeData) return;
        
        try {
          // Handle card drag and drop
          if (activeData.type === 'card') {
            const activeCard = activeData.card;
            
            // Moving card to a column
            if (overData?.type === 'column') {
              const targetColumn = overData.column;
              if (activeCard.columnId !== targetColumn.id) {
                await get().moveCard(activeCard.id, targetColumn.id, 0);
              }
            }
            // Moving card within column or to another card position
            else if (overData?.type === 'card') {
              const targetCard = overData.card;
              if (activeCard.id !== targetCard.id) {
                await get().moveCard(activeCard.id, targetCard.columnId, targetCard.order);
              }
            }
          }
          
          // Handle column reordering
          else if (activeData.type === 'column' && overData?.type === 'column') {
            const activeColumn = activeData.column;
            const overColumn = overData.column;
            
            if (activeColumn.id !== overColumn.id && activeColumn.boardId === overColumn.boardId) {
              const { columns } = get();
              const boardColumns = columns.filter(c => c.boardId === activeColumn.boardId);
              
              const activeIndex = boardColumns.findIndex(c => c.id === activeColumn.id);
              const overIndex = boardColumns.findIndex(c => c.id === overColumn.id);
              
              if (activeIndex !== -1 && overIndex !== -1) {
                const reorderedColumns = [...boardColumns];
                const [movedColumn] = reorderedColumns.splice(activeIndex, 1);
                reorderedColumns.splice(overIndex, 0, movedColumn);
                
                const columnIds = reorderedColumns.map(c => c.id);
                await get().reorderColumns(activeColumn.boardId, columnIds);
              }
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Drag operation failed';
          set({ error: errorMessage });
        }
      },
      
      // Utility actions
      reset: () => {
        set({
          ...initialState,
          isLoading: false,
          error: null,
          activeDragData: null,
        });
      },
    }),
    {
      name: 'taskly-store',
      partialize: (state) => ({
        // Only persist UI state and user data
        user: state.user,
        currentView: state.user ? state.currentView : 'auth',
        authMode: state.authMode,
      }),
    }
  )
);