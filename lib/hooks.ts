import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { 
  AppState, 
  Board, 
  Column, 
  Card, 
  User, 
  ViewMode, 
  UIState, 
  LoginCredentials, 
  SignUpCredentials,
  AuthResponse
} from '@/types';

// Define the store interface with proper types
interface TasklyStore extends AppState, UIState {
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  setUser: (user: User | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  
  // UI actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  
  // Board actions
  createBoard: (title: string) => Promise<void>;
  loadBoards: () => Promise<void>;
  updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => void;
  deleteBoard: (id: string) => void;
  reorderColumns: (boardId: string, columnIds: string[]) => void;
  
  // Column actions
  addColumn: (boardId: string, title: string) => void;
  updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => void;
  deleteColumn: (id: string) => void;
  
  // Card actions
  addCard: (columnId: string, title: string, description?: string) => void;
  updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, toColumnId: string, toPosition: number) => void;
  
  // Utility functions
  getBoardById: (id: string) => Board | undefined;
  getColumnsByBoardId: (boardId: string) => Column[];
  getCardsByColumnId: (columnId: string) => Card[];
  getCardById: (id: string) => Card | undefined;
}

export const useTaskly = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      boards: [],
      columns: [],
      cards: [],
      user: null,
      currentView: 'auth' as ViewMode,
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login' as 'login' | 'signup',
      isLoading: false,
      error: null,

      // Auth actions
      setUser: (user: User | null) => {
        set({ user });
        if (user) {
          set({ currentView: 'boards' });
        } else {
          set({ currentView: 'auth' });
        }
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
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
          
          // Store token in localStorage
          localStorage.setItem('taskly_token', authResponse.token);
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false,
            error: null
          });

          // Load user's boards
          await get().loadBoards();
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Login failed'
          });
          throw error;
        }
      },

      signUp: async (credentials: SignUpCredentials) => {
        set({ isLoading: true, error: null });
        
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
          
          // Store token in localStorage
          localStorage.setItem('taskly_token', authResponse.token);
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false,
            error: null
          });

          // Load user's boards (should be empty for new users)
          await get().loadBoards();
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Sign up failed'
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('taskly_token');
        set({
          user: null,
          currentView: 'auth',
          boards: [],
          columns: [],
          cards: [],
          selectedBoardId: null,
          selectedCardId: null,
        });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('taskly_token');
        if (!token) return;

        try {
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const { user } = await response.json();
            set({ user, currentView: 'boards' });
            await get().loadBoards();
          } else {
            localStorage.removeItem('taskly_token');
            set({ user: null, currentView: 'auth' });
          }
        } catch (error) {
          localStorage.removeItem('taskly_token');
          set({ user: null, currentView: 'auth' });
        }
      },

      clearError: () => set({ error: null }),

      // UI actions
      setCurrentView: (view: ViewMode) => set({ currentView: view }),
      setSelectedBoardId: (id: string | null) => set({ selectedBoardId: id }),
      setSelectedCardId: (id: string | null) => set({ selectedCardId: id }),
      setAuthMode: (mode: 'login' | 'signup') => set({ authMode: mode }),

      // Board actions
      createBoard: async (title: string) => {
        const state = get();
        if (!state.user) return;

        // Create optimistic board
        const newBoard: Board = {
          id: `temp-${Date.now()}`,
          title,
          order: state.boards.length,
          isArchived: false,
          userId: state.user.id,
        };

        set((state: TasklyStore) => ({
          boards: [...state.boards, newBoard],
        }));
      },

      loadBoards: async () => {
        const state = get();
        if (!state.user) return;

        try {
          // In a real implementation, this would fetch from the API
          // For now, we'll keep the boards in local state
        } catch (error) {
          console.error('Failed to load boards:', error);
        }
      },

      updateBoard: (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>) => {
        set((state: TasklyStore) => ({
          boards: state.boards.map((board: Board) =>
            board.id === id ? { ...board, ...updates } : board
          ),
        }));
      },

      deleteBoard: (id: string) => {
        set((state: TasklyStore) => ({
          boards: state.boards.filter((board: Board) => board.id !== id),
          columns: state.columns.filter((column: Column) => column.boardId !== id),
          cards: state.cards.filter((card: Card) => card.boardId !== id),
        }));
      },

      reorderColumns: (boardId: string, columnIds: string[]) => {
        set((state: TasklyStore) => ({
          columns: state.columns.map((column: Column) => {
            const newOrder = columnIds.indexOf(column.id);
            return newOrder >= 0 ? { ...column, order: newOrder } : column;
          }),
        }));
      },

      // Column actions
      addColumn: (boardId: string, title: string) => {
        const state = get();
        const boardColumns = state.columns.filter((col: Column) => col.boardId === boardId);
        
        const newColumn: Column = {
          id: `temp-${Date.now()}`,
          boardId,
          title,
          order: boardColumns.length,
        };

        set((state: TasklyStore) => ({
          columns: [...state.columns, newColumn],
        }));
      },

      updateColumn: (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>) => {
        set((state: TasklyStore) => ({
          columns: state.columns.map((column: Column) =>
            column.id === id ? { ...column, ...updates } : column
          ),
        }));
      },

      deleteColumn: (id: string) => {
        set((state: TasklyStore) => ({
          columns: state.columns.filter((column: Column) => column.id !== id),
          cards: state.cards.filter((card: Card) => card.columnId !== id),
        }));
      },

      // Card actions
      addCard: (columnId: string, title: string, description?: string) => {
        const state = get();
        const columnCards = state.cards.filter((col: Column) => col.boardId === columnId);
        const column = state.columns.find((col: Column) => col.id === columnId);
        
        if (!column) return;

        const newCard: Card = {
          id: `temp-${Date.now()}`,
          boardId: column.boardId,
          columnId,
          title,
          description: description || '',
          order: columnCards.length,
          isArchived: false,
        };

        set((state: TasklyStore) => ({
          cards: [...state.cards, newCard],
        }));
      },

      updateCard: (id: string, updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>) => {
        set((state: TasklyStore) => ({
          cards: state.cards.map((card: Card) =>
            card.id === id ? { ...card, ...updates } : card
          ),
        }));
      },

      deleteCard: (id: string) => {
        set((state: TasklyStore) => ({
          cards: state.cards.filter((card: Card) => card.id !== id),
        }));
      },

      moveCard: (cardId: string, toColumnId: string, toPosition: number) => {
        const state = get();
        const card = state.cards.find((c: Card) => c.id === cardId);
        if (!card) return;

        // Update card's column and position
        const targetColumnCards = state.cards
          .filter((c: Card) => c.columnId === toColumnId && c.id !== cardId)
          .sort((a: Card, b: Card) => a.order - b.order);

        // Reorder cards in the target column
        targetColumnCards.splice(toPosition, 0, card);

        set((state: TasklyStore) => ({
          cards: state.cards.map((c: Card) => {
            if (c.id === cardId) {
              return { ...c, columnId: toColumnId, order: toPosition };
            }
            if (c.columnId === toColumnId) {
              const newIndex = targetColumnCards.findIndex((tc: Card) => tc.id === c.id);
              return newIndex >= 0 ? { ...c, order: newIndex } : c;
            }
            return c;
          }),
        }));
      },

      // Utility functions
      getBoardById: (id: string) => {
        return get().boards.find((board: Board) => board.id === id);
      },

      getColumnsByBoardId: (boardId: string) => {
        return get().columns
          .filter((column: Column) => column.boardId === boardId)
          .sort((a: Column, b: Column) => a.order - b.order);
      },

      getCardsByColumnId: (columnId: string) => {
        return get().cards
          .filter((card: Card) => card.columnId === columnId && !card.isArchived)
          .sort((a: Card, b: Card) => a.order - b.order);
      },

      getCardById: (id: string) => {
        return get().cards.find((card: Card) => card.id === id);
      },
    }),
    {
      name: 'taskly-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist data, not UI state
      partialize: (state: TasklyStore) => ({
        boards: state.boards,
        columns: state.columns,
        cards: state.cards,
        user: state.user,
      }),
    }
  )
);