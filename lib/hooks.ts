'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, AuthResponse, LoginCredentials, SignUpCredentials, UIState } from '@/types';

interface TasklyStore extends AppState {
  // UI State
  uiState: UIState;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setCurrentView: (view: UIState['currentView']) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // Auth actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  clearError: () => void;
  
  // Data actions
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  
  // Board actions
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: { title?: string; isArchived?: boolean }) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  // Column actions
  createColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: { title?: string }) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (boardId: string, columnIds: string[]) => Promise<void>;
  
  // Card actions
  createCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: any) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, newColumnId: string, newIndex: number) => Promise<void>;
}

export const useTaskly = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      boards: [],
      columns: [],
      cards: [],
      user: null,
      
      // UI state
      uiState: {
        currentView: 'auth',
        selectedBoardId: null,
        selectedCardId: null,
        authMode: 'login',
      },
      
      // Loading and error states
      isLoading: false,
      error: null,
      
      // UI actions
      setAuthMode: (mode) =>
        set((state) => ({
          uiState: { ...state.uiState, authMode: mode },
        })),
        
      setCurrentView: (view) =>
        set((state) => ({
          uiState: { ...state.uiState, currentView: view },
        })),
        
      setSelectedBoardId: (id) =>
        set((state) => ({
          uiState: { ...state.uiState, selectedBoardId: id },
        })),
        
      setSelectedCardId: (id) =>
        set((state) => ({
          uiState: { ...state.uiState, selectedCardId: id },
        })),
      
      // Auth actions
      login: async (credentials) => {
        set({ isLoading: true, error: null });
        
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
          localStorage.setItem('auth_token', data.token);
          set({
            user: data.user,
            uiState: { ...get().uiState, currentView: 'boards' },
            isLoading: false,
          });
          
          // Load user data
          await get().loadData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      signUp: async (credentials) => {
        set({ isLoading: true, error: null });
        
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
          
          // Store token and user
          localStorage.setItem('auth_token', data.token);
          set({
            user: data.user,
            uiState: { ...get().uiState, currentView: 'boards' },
            isLoading: false,
          });
          
          // Load user data (will be empty for new user)
          await get().loadData();
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign up failed',
            isLoading: false,
          });
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('auth_token');
        set({
          user: null,
          boards: [],
          columns: [],
          cards: [],
          uiState: {
            currentView: 'auth',
            selectedBoardId: null,
            selectedCardId: null,
            authMode: 'login',
          },
          error: null,
        });
      },
      
      verifyAuth: async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
          set({
            uiState: { ...get().uiState, currentView: 'auth' },
          });
          return;
        }
        
        try {
          const response = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (!response.ok) {
            throw new Error('Token invalid');
          }
          
          const data = await response.json();
          set({
            user: data.user,
            uiState: { ...get().uiState, currentView: 'boards' },
          });
          
          await get().loadData();
        } catch (error) {
          localStorage.removeItem('auth_token');
          set({
            user: null,
            uiState: { ...get().uiState, currentView: 'auth' },
          });
        }
      },
      
      clearError: () => set({ error: null }),
      
      // Data actions
      loadData: async () => {
        const { user } = get();
        if (!user) return;
        
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;
          
          // Load boards
          const boardsResponse = await fetch('/api/boards', {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (boardsResponse.ok) {
            const boardsData = await boardsResponse.json();
            set({ boards: boardsData.boards });
            
            // Load columns and cards for all boards
            const allColumns = [];
            const allCards = [];
            
            for (const board of boardsData.boards) {
              const columnsResponse = await fetch(`/api/columns?boardId=${board.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              if (columnsResponse.ok) {
                const columnsData = await columnsResponse.json();
                allColumns.push(...columnsData.columns);
                
                for (const column of columnsData.columns) {
                  const cardsResponse = await fetch(`/api/cards?columnId=${column.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  
                  if (cardsResponse.ok) {
                    const cardsData = await cardsResponse.json();
                    allCards.push(...cardsData.cards);
                  }
                }
              }
            }
            
            set({ columns: allColumns, cards: allCards });
          }
        } catch (error) {
          console.error('Failed to load data:', error);
        }
      },
      
      saveData: async () => {
        // Data is automatically saved via API calls
      },
      
      // Board actions
      createBoard: async (title) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch('/api/boards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title }),
          });
          
          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              boards: [...state.boards, data.board],
            }));
          }
        } catch (error) {
          console.error('Failed to create board:', error);
        }
      },
      
      updateBoard: async (id, updates) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/boards/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });
          
          if (response.ok) {
            set((state) => ({
              boards: state.boards.map((board) =>
                board.id === id ? { ...board, ...updates } : board
              ),
            }));
          }
        } catch (error) {
          console.error('Failed to update board:', error);
        }
      },
      
      deleteBoard: async (id) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/boards/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            set((state) => ({
              boards: state.boards.filter((board) => board.id !== id),
              columns: state.columns.filter((column) => column.boardId !== id),
              cards: state.cards.filter((card) => card.boardId !== id),
            }));
          }
        } catch (error) {
          console.error('Failed to delete board:', error);
        }
      },
      
      // Column actions
      createColumn: async (boardId, title) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch('/api/columns', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ boardId, title }),
          });
          
          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              columns: [...state.columns, data.column],
            }));
          }
        } catch (error) {
          console.error('Failed to create column:', error);
        }
      },
      
      updateColumn: async (id, updates) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/columns/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });
          
          if (response.ok) {
            set((state) => ({
              columns: state.columns.map((column) =>
                column.id === id ? { ...column, ...updates } : column
              ),
            }));
          }
        } catch (error) {
          console.error('Failed to update column:', error);
        }
      },
      
      deleteColumn: async (id) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/columns/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            set((state) => ({
              columns: state.columns.filter((column) => column.id !== id),
              cards: state.cards.filter((card) => card.columnId !== id),
            }));
          }
        } catch (error) {
          console.error('Failed to delete column:', error);
        }
      },
      
      reorderColumns: async (boardId, columnIds) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch('/api/columns/reorder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ boardId, columnIds }),
          });
          
          if (response.ok) {
            // Optimistically update the order
            set((state) => ({
              columns: state.columns.map((column) => {
                if (column.boardId === boardId) {
                  const newOrder = columnIds.indexOf(column.id);
                  return newOrder >= 0 ? { ...column, order: newOrder } : column;
                }
                return column;
              }),
            }));
          }
        } catch (error) {
          console.error('Failed to reorder columns:', error);
        }
      },
      
      // Card actions
      createCard: async (columnId, title, description) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch('/api/cards', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ columnId, title, description }),
          });
          
          if (response.ok) {
            const data = await response.json();
            set((state) => ({
              cards: [...state.cards, data.card],
            }));
          }
        } catch (error) {
          console.error('Failed to create card:', error);
        }
      },
      
      updateCard: async (id, updates) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updates),
          });
          
          if (response.ok) {
            set((state) => ({
              cards: state.cards.map((card) =>
                card.id === id ? { ...card, ...updates } : card
              ),
            }));
          }
        } catch (error) {
          console.error('Failed to update card:', error);
        }
      },
      
      deleteCard: async (id) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/cards/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (response.ok) {
            set((state) => ({
              cards: state.cards.filter((card) => card.id !== id),
            }));
          }
        } catch (error) {
          console.error('Failed to delete card:', error);
        }
      },
      
      moveCard: async (cardId, newColumnId, newIndex) => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        try {
          const response = await fetch(`/api/cards/${cardId}/move`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ columnId: newColumnId, order: newIndex }),
          });
          
          if (response.ok) {
            set((state) => ({
              cards: state.cards.map((card) =>
                card.id === cardId
                  ? { ...card, columnId: newColumnId, order: newIndex }
                  : card
              ),
            }));
          }
        } catch (error) {
          console.error('Failed to move card:', error);
        }
      },
    }),
    {
      name: 'taskly-storage',
      partialize: (state) => ({
        user: state.user,
        uiState: state.uiState,
      }),
    }
  )
);