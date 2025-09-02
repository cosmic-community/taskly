'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Board, Column, Card, User, ViewMode, LoginCredentials, SignUpCredentials } from '@/types';
import { 
  getUserBoards, 
  createBoard as createBoardApi, 
  updateBoard as updateBoardApi, 
  deleteBoard as deleteBoardApi,
  getBoardColumns,
  createColumn as createColumnApi,
  updateColumn as updateColumnApi,
  deleteColumn as deleteColumnApi,
  getColumnCards,
  getBoardCards,
  createCard as createCardApi,
  updateCard as updateCardApi,
  deleteCard as deleteCardApi
} from '@/lib/cosmic';

interface TasklyStore {
  // Data state
  user: User | null;
  boards: Board[];
  columns: Column[];
  cards: Card[];
  
  // UI state
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  authMode: 'login' | 'signup';
  
  // Loading and error state
  isLoading: boolean;
  error: string | null;
  
  // Auth methods
  checkAuth: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;
  
  // Navigation methods
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  
  // Data methods
  loadUserData: () => Promise<void>;
  
  // Board methods
  getBoardById: (id: string) => Board | undefined;
  createBoard: (title: string) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  
  // Column methods
  getColumnsByBoardId: (boardId: string) => Column[];
  addColumn: (boardId: string, title: string) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  
  // Card methods
  getCardsByColumnId: (columnId: string) => Card[];
  getCardById: (id: string) => Card | undefined;
  addCard: (columnId: string, title: string, description?: string) => Promise<void>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (cardId: string, columnId: string) => Promise<void>;
}

const useTasklyStore = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      boards: [],
      columns: [],
      cards: [],
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
      isLoading: false,
      error: null,

      // Auth methods
      checkAuth: async () => {
        const token = localStorage.getItem('taskly-token');
        if (!token) {
          set({ currentView: 'auth', user: null });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const { user } = await response.json();
            set({ user, currentView: 'boards' });
            await get().loadUserData();
          } else {
            localStorage.removeItem('taskly-token');
            set({ currentView: 'auth', user: null });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('taskly-token');
          set({ currentView: 'auth', user: null, error: 'Authentication failed' });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (credentials) => {
        try {
          set({ isLoading: true, error: null });
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials),
          });

          const data = await response.json();

          if (response.ok) {
            localStorage.setItem('taskly-token', data.token);
            set({ user: data.user, currentView: 'boards' });
            await get().loadUserData();
          } else {
            set({ error: data.error || 'Login failed' });
          }
        } catch (error) {
          console.error('Login failed:', error);
          set({ error: 'Network error. Please try again.' });
        } finally {
          set({ isLoading: false });
        }
      },

      signUp: async (credentials) => {
        if (credentials.password !== credentials.confirmPassword) {
          set({ error: 'Passwords do not match' });
          return;
        }

        try {
          set({ isLoading: true, error: null });
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

          if (response.ok) {
            localStorage.setItem('taskly-token', data.token);
            set({ user: data.user, currentView: 'boards' });
            await get().loadUserData();
          } else {
            set({ error: data.error || 'Sign up failed' });
          }
        } catch (error) {
          console.error('Sign up failed:', error);
          set({ error: 'Network error. Please try again.' });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem('taskly-token');
        set({
          user: null,
          boards: [],
          columns: [],
          cards: [],
          currentView: 'auth',
          selectedBoardId: null,
          selectedCardId: null,
          error: null,
        });
      },

      setAuthMode: (mode) => set({ authMode: mode }),
      clearError: () => set({ error: null }),

      // Navigation methods
      setCurrentView: (view) => set({ currentView: view }),
      setSelectedBoardId: (id) => set({ selectedBoardId: id }),
      setSelectedCardId: (id) => set({ selectedCardId: id }),

      // Data methods
      loadUserData: async () => {
        const { user } = get();
        if (!user) return;

        try {
          set({ isLoading: true });
          const [boards, columns, cards] = await Promise.all([
            getUserBoards(user.id),
            // For now, load all columns and cards - in a real app you might optimize this
            getBoardColumns(''), // We'll filter by board later
            getBoardCards(''), // We'll filter by board later
          ]);

          set({ boards, columns: [], cards: [] }); // Start with empty columns/cards, load as needed
        } catch (error) {
          console.error('Failed to load user data:', error);
          set({ error: 'Failed to load data' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Board methods
      getBoardById: (id) => {
        const { boards } = get();
        return boards.find(board => board.id === id);
      },

      createBoard: async (title) => {
        const { user, boards } = get();
        if (!user) return;

        try {
          set({ isLoading: true });
          const order = Math.max(...boards.map(b => b.order), 0) + 1;
          const newBoard = await createBoardApi(title, user.id, order);
          set({ boards: [...boards, newBoard] });
        } catch (error) {
          console.error('Failed to create board:', error);
          set({ error: 'Failed to create board' });
        } finally {
          set({ isLoading: false });
        }
      },

      updateBoard: async (id, updates) => {
        try {
          set({ isLoading: true });
          await updateBoardApi(id, updates);
          const { boards } = get();
          set({
            boards: boards.map(board =>
              board.id === id ? { ...board, ...updates } : board
            ),
          });
        } catch (error) {
          console.error('Failed to update board:', error);
          set({ error: 'Failed to update board' });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteBoard: async (id) => {
        try {
          set({ isLoading: true });
          await deleteBoardApi(id);
          const { boards, columns, cards } = get();
          set({
            boards: boards.filter(board => board.id !== id),
            columns: columns.filter(column => column.boardId !== id),
            cards: cards.filter(card => card.boardId !== id),
          });
          
          // Reset selection if deleted board was selected
          const { selectedBoardId } = get();
          if (selectedBoardId === id) {
            set({ selectedBoardId: null, currentView: 'boards' });
          }
        } catch (error) {
          console.error('Failed to delete board:', error);
          set({ error: 'Failed to delete board' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Column methods
      getColumnsByBoardId: (boardId) => {
        const { columns } = get();
        return columns.filter(column => column.boardId === boardId)
          .sort((a, b) => a.order - b.order);
      },

      addColumn: async (boardId, title) => {
        try {
          set({ isLoading: true });
          const { columns } = get();
          const boardColumns = columns.filter(col => col.boardId === boardId);
          const order = Math.max(...boardColumns.map(c => c.order), 0) + 1;
          
          const newColumn = await createColumnApi(boardId, title, order);
          set({ columns: [...columns, newColumn] });
        } catch (error) {
          console.error('Failed to create column:', error);
          set({ error: 'Failed to create column' });
        } finally {
          set({ isLoading: false });
        }
      },

      updateColumn: async (id, updates) => {
        try {
          set({ isLoading: true });
          await updateColumnApi(id, updates);
          const { columns } = get();
          set({
            columns: columns.map(column =>
              column.id === id ? { ...column, ...updates } : column
            ),
          });
        } catch (error) {
          console.error('Failed to update column:', error);
          set({ error: 'Failed to update column' });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteColumn: async (id) => {
        try {
          set({ isLoading: true });
          await deleteColumnApi(id);
          const { columns, cards } = get();
          set({
            columns: columns.filter(column => column.id !== id),
            cards: cards.filter(card => card.columnId !== id),
          });
        } catch (error) {
          console.error('Failed to delete column:', error);
          set({ error: 'Failed to delete column' });
        } finally {
          set({ isLoading: false });
        }
      },

      // Card methods
      getCardsByColumnId: (columnId) => {
        const { cards } = get();
        return cards.filter(card => card.columnId === columnId)
          .sort((a, b) => a.order - b.order);
      },

      getCardById: (id) => {
        const { cards } = get();
        return cards.find(card => card.id === id);
      },

      addCard: async (columnId, title, description) => {
        const { columns, cards } = get();
        const column = columns.find(c => c.id === columnId);
        if (!column) return;

        try {
          set({ isLoading: true });
          const columnCards = cards.filter(card => card.columnId === columnId);
          const order = Math.max(...columnCards.map(c => c.order), 0) + 1;
          
          const newCard = await createCardApi(
            column.boardId,
            columnId,
            title,
            description,
            undefined,
            undefined,
            order
          );
          set({ cards: [...cards, newCard] });
        } catch (error) {
          console.error('Failed to create card:', error);
          set({ error: 'Failed to create card' });
        } finally {
          set({ isLoading: false });
        }
      },

      updateCard: async (id, updates) => {
        try {
          set({ isLoading: true });
          await updateCardApi(id, updates);
          const { cards } = get();
          set({
            cards: cards.map(card =>
              card.id === id ? { ...card, ...updates } : card
            ),
          });
        } catch (error) {
          console.error('Failed to update card:', error);
          set({ error: 'Failed to update card' });
        } finally {
          set({ isLoading: false });
        }
      },

      deleteCard: async (id) => {
        try {
          set({ isLoading: true });
          await deleteCardApi(id);
          const { cards } = get();
          set({ cards: cards.filter(card => card.id !== id) });
          
          // Reset selection if deleted card was selected
          const { selectedCardId } = get();
          if (selectedCardId === id) {
            set({ selectedCardId: null });
          }
        } catch (error) {
          console.error('Failed to delete card:', error);
          set({ error: 'Failed to delete card' });
        } finally {
          set({ isLoading: false });
        }
      },

      moveCard: async (cardId, columnId) => {
        try {
          set({ isLoading: true });
          await updateCardApi(cardId, { columnId });
          const { cards } = get();
          set({
            cards: cards.map(card =>
              card.id === cardId ? { ...card, columnId } : card
            ),
          });
        } catch (error) {
          console.error('Failed to move card:', error);
          set({ error: 'Failed to move card' });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'taskly-store',
      partialize: (state) => ({
        user: state.user,
        boards: state.boards,
        columns: state.columns,
        cards: state.cards,
      }),
    }
  )
);

// Custom hook for easier access
export const useTaskly = () => {
  const store = useTasklyStore();
  
  // Load columns and cards for selected board when board changes
  const loadBoardData = async (boardId: string) => {
    if (!boardId) return;
    
    try {
      const [columns, cards] = await Promise.all([
        getBoardColumns(boardId),
        getBoardCards(boardId),
      ]);
      
      useTasklyStore.setState({ columns, cards });
    } catch (error) {
      console.error('Failed to load board data:', error);
      useTasklyStore.setState({ error: 'Failed to load board data' });
    }
  };

  return {
    ...store,
    loadBoardData,
  };
};

export default useTasklyStore;