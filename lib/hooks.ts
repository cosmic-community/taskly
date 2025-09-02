import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  AppState, 
  User, 
  Board, 
  Column, 
  Card, 
  UIState, 
  ViewMode,
  LoginCredentials,
  SignUpCredentials,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  DragEndEvent,
} from '@/types';

// API helper functions
const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth-token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // Auth endpoints
  auth: {
    login: (credentials: LoginCredentials) => 
      api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    
    signup: (credentials: SignUpCredentials) => 
      api.request('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    
    verify: () => api.request('/api/auth/verify'),
  },

  // Board endpoints
  boards: {
    getAll: () => api.request('/api/boards'),
    create: (board: CreateBoardForm) => 
      api.request('/api/boards', {
        method: 'POST',
        body: JSON.stringify(board),
      }),
    update: (id: string, updates: Partial<Board>) => 
      api.request(`/api/boards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => 
      api.request(`/api/boards/${id}`, { method: 'DELETE' }),
  },

  // Column endpoints
  columns: {
    create: (column: CreateColumnForm & { boardId: string }) => 
      api.request('/api/columns', {
        method: 'POST',
        body: JSON.stringify(column),
      }),
    update: (id: string, updates: Partial<Column>) => 
      api.request(`/api/columns/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => 
      api.request(`/api/columns/${id}`, { method: 'DELETE' }),
    reorder: (columns: { id: string; order: number }[]) => 
      api.request('/api/columns/reorder', {
        method: 'PUT',
        body: JSON.stringify({ columns }),
      }),
  },

  // Card endpoints
  cards: {
    create: (card: CreateCardForm & { boardId: string; columnId: string }) => 
      api.request('/api/cards', {
        method: 'POST',
        body: JSON.stringify(card),
      }),
    update: (id: string, updates: Partial<EditCardForm>) => 
      api.request(`/api/cards/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => 
      api.request(`/api/cards/${id}`, { method: 'DELETE' }),
    move: (id: string, columnId: string, order?: number) => 
      api.request(`/api/cards/${id}/move`, {
        method: 'PUT',
        body: JSON.stringify({ columnId, order }),
      }),
  },
};

// Main store interface
interface TasklyStore {
  // State
  data: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;

  // Authentication actions
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;

  // Navigation actions
  setCurrentView: (view: ViewMode) => void;
  selectBoard: (boardId: string) => void;
  selectCard: (cardId: string | null) => void;
  goToBoards: () => void;
  goToBoard: (boardId: string) => void;

  // Data loading actions
  loadBoards: () => Promise<void>;
  loadBoardData: (boardId: string) => Promise<void>;
  
  // Board actions
  createBoard: (form: CreateBoardForm) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  toggleBoardArchive: (id: string) => Promise<void>;

  // Column actions
  createColumn: (boardId: string, form: CreateColumnForm) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  reorderColumns: (columns: { id: string; order: number }[]) => Promise<void>;

  // Card actions
  createCard: (boardId: string, columnId: string, form: CreateCardForm) => Promise<void>;
  updateCard: (id: string, updates: Partial<EditCardForm>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  moveCard: (id: string, columnId: string, order?: number) => Promise<void>;
  toggleCardArchive: (id: string) => Promise<void>;

  // Drag and drop
  handleDragEnd: (event: DragEndEvent) => Promise<void>;

  // Computed getters
  currentBoard: () => Board | null;
  currentBoardColumns: () => Column[];
  currentBoardCards: () => Card[];
  getColumnCards: (columnId: string) => Card[];
}

// Create the store
export const useTaskly = create<TasklyStore>()(
  persist(
    (set, get) => ({
      // Initial state
      data: {
        boards: [],
        columns: [],
        cards: [],
        user: null,
      },
      uiState: {
        currentView: 'auth',
        selectedBoardId: null,
        selectedCardId: null,
        authMode: 'login',
      },
      isLoading: false,
      error: null,

      // Helper function to set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // Helper function to set error state
      setError: (error: string | null) => {
        set({ error });
      },

      // Authentication actions
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.auth.login(credentials);
          
          // Store auth token
          localStorage.setItem('auth-token', response.token);
          
          // Update state
          set(state => ({
            data: { ...state.data, user: response.user },
            uiState: { ...state.uiState, currentView: 'boards' },
            isLoading: false,
          }));
          
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
        try {
          set({ isLoading: true, error: null });
          
          // Validate passwords match
          if (credentials.password !== credentials.confirmPassword) {
            throw new Error('Passwords do not match');
          }
          
          const response = await api.auth.signup(credentials);
          
          // Store auth token
          localStorage.setItem('auth-token', response.token);
          
          // Update state
          set(state => ({
            data: { ...state.data, user: response.user },
            uiState: { ...state.uiState, currentView: 'boards' },
            isLoading: false,
          }));
          
          // Load user's boards (will be empty for new users)
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
        localStorage.removeItem('auth-token');
        set({
          data: { boards: [], columns: [], cards: [], user: null },
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
        try {
          const token = localStorage.getItem('auth-token');
          if (!token) {
            get().logout();
            return;
          }

          set({ isLoading: true });
          const response = await api.auth.verify();
          
          set(state => ({
            data: { ...state.data, user: response.user },
            uiState: { ...state.uiState, currentView: 'boards' },
            isLoading: false,
          }));
          
          await get().loadBoards();
        } catch (error) {
          get().logout();
        }
      },

      setAuthMode: (mode: 'login' | 'signup') => {
        set(state => ({
          uiState: { ...state.uiState, authMode: mode },
          error: null,
        }));
      },

      clearError: () => {
        set({ error: null });
      },

      // Navigation actions
      setCurrentView: (view: ViewMode) => {
        set(state => ({
          uiState: { ...state.uiState, currentView: view },
        }));
      },

      selectBoard: (boardId: string) => {
        set(state => ({
          uiState: { 
            ...state.uiState, 
            selectedBoardId: boardId,
            currentView: 'board',
          },
        }));
      },

      selectCard: (cardId: string | null) => {
        set(state => ({
          uiState: { 
            ...state.uiState, 
            selectedCardId: cardId,
            currentView: cardId ? 'card' : 'board',
          },
        }));
      },

      goToBoards: () => {
        set(state => ({
          uiState: { 
            ...state.uiState,
            currentView: 'boards',
            selectedBoardId: null,
            selectedCardId: null,
          },
        }));
      },

      goToBoard: async (boardId: string) => {
        set(state => ({
          uiState: { 
            ...state.uiState,
            currentView: 'board',
            selectedBoardId: boardId,
            selectedCardId: null,
          },
        }));
        
        await get().loadBoardData(boardId);
      },

      // Data loading actions
      loadBoards: async () => {
        try {
          set({ isLoading: true, error: null });
          const response = await api.boards.getAll();
          
          set(state => ({
            data: { ...state.data, boards: response.boards || [] },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load boards'
          });
        }
      },

      loadBoardData: async (boardId: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Load board data would typically come from a single endpoint
          // For now, we'll assume the data is already loaded or load it separately
          // This is a placeholder for board-specific data loading
          
          set({ isLoading: false });
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to load board data'
          });
        }
      },

      // Board actions
      createBoard: async (form: CreateBoardForm) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.boards.create(form);
          
          set(state => ({
            data: {
              ...state.data,
              boards: [...state.data.boards, response.board],
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create board'
          });
          throw error;
        }
      },

      updateBoard: async (id: string, updates: Partial<Board>) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.boards.update(id, updates);
          
          set(state => ({
            data: {
              ...state.data,
              boards: state.data.boards.map(board =>
                board.id === id ? { ...board, ...updates } : board
              ),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to update board'
          });
          throw error;
        }
      },

      deleteBoard: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.boards.delete(id);
          
          set(state => ({
            data: {
              ...state.data,
              boards: state.data.boards.filter(board => board.id !== id),
              columns: state.data.columns.filter(column => column.boardId !== id),
              cards: state.data.cards.filter(card => card.boardId !== id),
            },
            uiState: state.uiState.selectedBoardId === id 
              ? { ...state.uiState, currentView: 'boards', selectedBoardId: null }
              : state.uiState,
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to delete board'
          });
          throw error;
        }
      },

      toggleBoardArchive: async (id: string) => {
        const board = get().data.boards.find(b => b.id === id);
        if (!board) return;
        
        await get().updateBoard(id, { isArchived: !board.isArchived });
      },

      // Column actions
      createColumn: async (boardId: string, form: CreateColumnForm) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.columns.create({ ...form, boardId });
          
          set(state => ({
            data: {
              ...state.data,
              columns: [...state.data.columns, response.column],
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create column'
          });
          throw error;
        }
      },

      updateColumn: async (id: string, updates: Partial<Column>) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.columns.update(id, updates);
          
          set(state => ({
            data: {
              ...state.data,
              columns: state.data.columns.map(column =>
                column.id === id ? { ...column, ...updates } : column
              ),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to update column'
          });
          throw error;
        }
      },

      deleteColumn: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.columns.delete(id);
          
          set(state => ({
            data: {
              ...state.data,
              columns: state.data.columns.filter(column => column.id !== id),
              cards: state.data.cards.filter(card => card.columnId !== id),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to delete column'
          });
          throw error;
        }
      },

      reorderColumns: async (columns: { id: string; order: number }[]) => {
        try {
          await api.columns.reorder(columns);
          
          set(state => ({
            data: {
              ...state.data,
              columns: state.data.columns.map(column => {
                const reorderedColumn = columns.find(c => c.id === column.id);
                return reorderedColumn 
                  ? { ...column, order: reorderedColumn.order }
                  : column;
              }),
            },
          }));
        } catch (error) {
          console.error('Failed to reorder columns:', error);
        }
      },

      // Card actions
      createCard: async (boardId: string, columnId: string, form: CreateCardForm) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await api.cards.create({ ...form, boardId, columnId });
          
          set(state => ({
            data: {
              ...state.data,
              cards: [...state.data.cards, response.card],
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to create card'
          });
          throw error;
        }
      },

      updateCard: async (id: string, updates: Partial<EditCardForm>) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.cards.update(id, updates);
          
          set(state => ({
            data: {
              ...state.data,
              cards: state.data.cards.map(card =>
                card.id === id ? { ...card, ...updates } : card
              ),
            },
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to update card'
          });
          throw error;
        }
      },

      deleteCard: async (id: string) => {
        try {
          set({ isLoading: true, error: null });
          
          await api.cards.delete(id);
          
          set(state => ({
            data: {
              ...state.data,
              cards: state.data.cards.filter(card => card.id !== id),
            },
            uiState: state.uiState.selectedCardId === id 
              ? { ...state.uiState, selectedCardId: null, currentView: 'board' }
              : state.uiState,
            isLoading: false,
          }));
        } catch (error) {
          set({ 
            isLoading: false, 
            error: error instanceof Error ? error.message : 'Failed to delete card'
          });
          throw error;
        }
      },

      moveCard: async (id: string, columnId: string, order?: number) => {
        try {
          await api.cards.move(id, columnId, order);
          
          set(state => ({
            data: {
              ...state.data,
              cards: state.data.cards.map(card =>
                card.id === id 
                  ? { ...card, columnId, ...(order !== undefined && { order }) }
                  : card
              ),
            },
          }));
        } catch (error) {
          console.error('Failed to move card:', error);
        }
      },

      toggleCardArchive: async (id: string) => {
        const card = get().data.cards.find(c => c.id === id);
        if (!card) return;
        
        await get().updateCard(id, { isArchived: !card.isArchived });
      },

      // Drag and drop handler
      handleDragEnd: async (event: DragEndEvent) => {
        const { active, over } = event;
        
        if (!over || active.id === over.id) return;
        
        const activeData = active.data.current;
        const overData = over.data.current;
        
        if (!activeData) return;
        
        // Handle card drag and drop
        if (activeData.type === 'card') {
          const card = activeData.card as Card;
          
          // Moving to a column
          if (overData?.type === 'column') {
            const targetColumnId = overData.column.id;
            if (card.columnId !== targetColumnId) {
              await get().moveCard(card.id, targetColumnId);
            }
          }
          // Moving to another card (reordering within column)
          else if (overData?.type === 'card') {
            const targetCard = overData.card as Card;
            if (card.columnId === targetCard.columnId && card.id !== targetCard.id) {
              // Calculate new order based on target card's order
              const newOrder = targetCard.order;
              await get().moveCard(card.id, card.columnId, newOrder);
            }
          }
        }
        
        // Handle column reordering
        if (activeData.type === 'column' && overData?.type === 'column') {
          const activeColumn = activeData.column as Column;
          const overColumn = overData.column as Column;
          
          if (activeColumn.boardId === overColumn.boardId) {
            // Get current columns for this board
            const boardColumns = get().currentBoardColumns();
            
            // Create reordered columns array
            const reorderedColumns = boardColumns.map((col, index) => ({
              id: col.id,
              order: index,
            }));
            
            await get().reorderColumns(reorderedColumns);
          }
        }
      },

      // Computed getters
      currentBoard: () => {
        const state = get();
        const boardId = state.uiState.selectedBoardId;
        return boardId ? state.data.boards.find(b => b.id === boardId) || null : null;
      },

      currentBoardColumns: () => {
        const state = get();
        const boardId = state.uiState.selectedBoardId;
        if (!boardId) return [];
        
        return state.data.columns
          .filter(col => col.boardId === boardId)
          .sort((a, b) => a.order - b.order);
      },

      currentBoardCards: () => {
        const state = get();
        const boardId = state.uiState.selectedBoardId;
        if (!boardId) return [];
        
        return state.data.cards
          .filter(card => card.boardId === boardId && !card.isArchived)
          .sort((a, b) => a.order - b.order);
      },

      getColumnCards: (columnId: string) => {
        const state = get();
        return state.data.cards
          .filter(card => card.columnId === columnId && !card.isArchived)
          .sort((a, b) => a.order - b.order);
      },
    }),
    {
      name: 'taskly-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        data: {
          boards: state.data.boards,
          columns: state.data.columns,
          cards: state.data.cards,
          user: state.data.user,
        },
        uiState: state.uiState,
      }),
    }
  )
);