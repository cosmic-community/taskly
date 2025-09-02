'use client';

import { nanoid } from 'nanoid';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppState, UIState, Board, Column, Card, User, ViewMode, AuthResponse, LoginCredentials, SignUpCredentials } from '@/types';

interface TasklyStore extends AppState, UIState {
  // State flags
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  setUser: (user: User | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  
  // UI actions
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Board actions
  addBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  // Column actions
  addColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
  
  // Card actions
  addCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, toColumnId: string, toPosition?: number) => Promise<void>;
  
  // Data management
  loadUserData: () => Promise<void>;
  initializeFromCookie: () => void;
}

const initialUIState: UIState = {
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  authMode: 'login',
};

const initialAppState: AppState = {
  boards: [],
  columns: [],
  cards: [],
  user: null,
};

export const useTaskly = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialAppState,
      ...initialUIState,
      isLoading: false,
      error: null,

      // Auth actions
      setUser: (user) => {
        set({ 
          user,
          currentView: user ? 'boards' : 'auth'
        });
      },

      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Login failed');
          }

          const authResponse = data as AuthResponse;
          
          // Store token in cookie
          document.cookie = `auth-token=${authResponse.token}; path=/; max-age=${30 * 24 * 60 * 60}; secure; samesite=strict`;
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false,
            error: null
          });

          // Load user data
          await get().loadUserData();
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
          });
          throw error;
        }
      },

      signUp: async (credentials) => {
        set({ isLoading: true, error: null });
        
        if (credentials.password !== credentials.confirmPassword) {
          set({ 
            isLoading: false,
            error: 'Passwords do not match'
          });
          return;
        }

        try {
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

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Sign up failed');
          }

          const authResponse = data as AuthResponse;
          
          // Store token in cookie
          document.cookie = `auth-token=${authResponse.token}; path=/; max-age=${30 * 24 * 60 * 60}; secure; samesite=strict`;
          
          set({ 
            user: authResponse.user,
            currentView: 'boards',
            isLoading: false,
            error: null
          });

          // Load user data (will be empty for new users)
          await get().loadUserData();
        } catch (error) {
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sign up failed'
          });
          throw error;
        }
      },

      logout: () => {
        // Clear auth cookie
        document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        set({
          ...initialAppState,
          ...initialUIState,
          isLoading: false,
          error: null,
        });
      },

      // UI actions
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedBoardId: (id) => set({ selectedBoardId: id }),
      setSelectedCardId: (id) => set({ selectedCardId: id }),
      setAuthMode: (mode) => set({ authMode: mode }),
      clearError: () => set({ error: null }),

      // Board actions
      addBoard: async (title) => {
        const user = get().user;
        if (!user) return;

        const newBoard: Board = {
          id: nanoid(),
          title,
          order: get().boards.length,
          isArchived: false,
          userId: user.id,
        };

        set((state) => ({
          boards: [...state.boards, newBoard]
        }));

        // TODO: Sync with Cosmic CMS
      },

      updateBoard: async (id, updates) => {
        set((state) => ({
          boards: state.boards.map((board) =>
            board.id === id ? { ...board, ...updates } : board
          ),
        }));

        // TODO: Sync with Cosmic CMS
      },

      deleteBoard: async (id) => {
        set((state) => ({
          boards: state.boards.filter((board) => board.id !== id),
          columns: state.columns.filter((column) => column.boardId !== id),
          cards: state.cards.filter((card) => card.boardId !== id),
        }));

        // TODO: Sync with Cosmic CMS
      },

      // Column actions
      addColumn: async (boardId, title) => {
        const newColumn: Column = {
          id: nanoid(),
          boardId,
          title,
          order: get().columns.filter((col) => col.boardId === boardId).length,
        };

        set((state) => ({
          columns: [...state.columns, newColumn],
        }));

        // TODO: Sync with Cosmic CMS
      },

      updateColumn: async (id, updates) => {
        set((state) => ({
          columns: state.columns.map((column) =>
            column.id === id ? { ...column, ...updates } : column
          ),
        }));

        // TODO: Sync with Cosmic CMS
      },

      deleteColumn: async (id) => {
        set((state) => ({
          columns: state.columns.filter((column) => column.id !== id),
          cards: state.cards.filter((card) => card.columnId !== id),
        }));

        // TODO: Sync with Cosmic CMS
      },

      reorderColumns: async (boardId, columnIds) => {
        set((state) => ({
          columns: state.columns.map((column) => {
            if (column.boardId === boardId) {
              const newOrder = columnIds.indexOf(column.id);
              return newOrder !== -1 ? { ...column, order: newOrder } : column;
            }
            return column;
          }),
        }));

        // TODO: Sync with Cosmic CMS
      },

      // Card actions
      addCard: async (columnId, title, description) => {
        const column = get().columns.find((col) => col.id === columnId);
        if (!column) return;

        const newCard: Card = {
          id: nanoid(),
          boardId: column.boardId,
          columnId,
          title,
          description,
          order: get().cards.filter((card) => card.columnId === columnId).length,
          isArchived: false,
        };

        set((state) => ({
          cards: [...state.cards, newCard],
        }));

        // TODO: Sync with Cosmic CMS
      },

      updateCard: async (id, updates) => {
        set((state) => ({
          cards: state.cards.map((card) =>
            card.id === id ? { ...card, ...updates } : card
          ),
        }));

        // TODO: Sync with Cosmic CMS
      },

      deleteCard: async (id) => {
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
        }));

        // TODO: Sync with Cosmic CMS
      },

      moveCard: async (cardId, toColumnId, toPosition) => {
        const state = get();
        const card = state.cards.find((c) => c.id === cardId);
        if (!card) return;

        const cardsInTargetColumn = state.cards
          .filter((c) => c.columnId === toColumnId)
          .sort((a, b) => a.order - b.order);

        const targetOrder = toPosition !== undefined ? toPosition : cardsInTargetColumn.length;

        set((state) => ({
          cards: state.cards.map((c) => {
            if (c.id === cardId) {
              return { ...c, columnId: toColumnId, order: targetOrder };
            }
            
            // Reorder other cards in the target column
            if (c.columnId === toColumnId && c.order >= targetOrder) {
              return { ...c, order: c.order + 1 };
            }
            
            return c;
          }),
        }));

        // TODO: Sync with Cosmic CMS
      },

      // Data management
      loadUserData: async () => {
        const user = get().user;
        if (!user) return;

        set({ isLoading: true });

        try {
          // TODO: Load data from Cosmic CMS
          // For now, we'll use empty arrays since no boards exist yet
          set({
            boards: [],
            columns: [],
            cards: [],
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load user data:', error);
          set({ 
            isLoading: false,
            error: 'Failed to load data'
          });
        }
      },

      initializeFromCookie: () => {
        // Check for auth token in cookie
        const cookies = document.cookie.split(';');
        const authToken = cookies
          .find(cookie => cookie.trim().startsWith('auth-token='))
          ?.split('=')[1];

        if (authToken) {
          // Verify token with server
          fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${authToken}`,
            },
          })
          .then(response => response.json())
          .then(data => {
            if (data.user) {
              get().setUser(data.user);
              get().loadUserData();
            }
          })
          .catch(() => {
            // Token is invalid, clear it
            get().logout();
          });
        }
      },
    }),
    {
      name: 'taskly-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist UI state, not app data (which comes from server)
        authMode: state.authMode,
      }),
    }
  )
);