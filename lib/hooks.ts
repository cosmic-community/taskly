import { create } from 'zustand';
import { AppState, User, Board, Column, Card, ViewMode, CreateBoardForm, CreateColumnForm, EditCardForm, LoginCredentials, SignUpCredentials, UIState } from '@/types';
import { getUserBoards, getBoardColumns, getBoardCards, createBoard as cosmicCreateBoard, createColumn as cosmicCreateColumn, createCard as cosmicCreateCard, updateCard as cosmicUpdateCard, deleteBoard as cosmicDeleteBoard, deleteColumn as cosmicDeleteColumn, deleteCard as cosmicDeleteCard } from '@/lib/cosmic';

interface TasklyStore extends AppState, UIState {
  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Authentication
  authenticateWithToken: () => Promise<void>;
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;

  // UI State
  setCurrentView: (view: ViewMode) => void;
  setSelectedBoardId: (id: string | null) => void;
  setSelectedCardId: (id: string | null) => void;
  selectedCard: Card | null;
  selectCard: (card: Card | null) => void;
  setView: (view: ViewMode) => void;

  // Board operations
  loadBoards: () => Promise<void>;
  createBoard: (form: CreateBoardForm) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;
  getSelectedBoard: () => Board | null;

  // Column operations
  loadColumns: (boardId: string) => Promise<void>;
  createColumn: (boardId: string, form: CreateColumnForm) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;
  getColumnsByBoardId: (boardId: string) => Column[];

  // Card operations
  loadCards: (boardId: string) => Promise<void>;
  createCard: (boardId: string, columnId: string, form: EditCardForm) => Promise<void>;
  updateCard: (id: string, updates: Partial<EditCardForm>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addCard: (boardId: string, columnId: string, form: EditCardForm) => Promise<void>;

  // Utility
  getCardsByColumnId: (columnId: string) => Card[];
}

export const useTaskly = create<TasklyStore>((set, get) => ({
  // Initial state
  boards: [],
  columns: [],
  cards: [],
  user: null,
  currentView: 'auth',
  selectedBoardId: null,
  selectedCardId: null,
  selectedCard: null,
  authMode: 'login',
  isLoading: false,
  error: null,
  
  // Computed properties
  uiState: {
    get currentView() { return get().currentView; },
    get selectedBoardId() { return get().selectedBoardId; },
    get selectedCardId() { return get().selectedCardId; },
    get authMode() { return get().authMode; },
  } as UIState,

  appState: {
    get boards() { return get().boards; },
    get columns() { return get().columns; },
    get cards() { return get().cards; },
    get user() { return get().user; },
  } as AppState,

  // Authentication methods
  authenticateWithToken: async () => {
    const token = localStorage.getItem('taskly_token');
    if (!token) return;

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        } as Record<string, string>,
      });

      if (response.ok) {
        const { user } = await response.json();
        set({ user, currentView: 'boards' });
        await get().loadBoards();
      } else {
        localStorage.removeItem('taskly_token');
      }
    } catch (error) {
      localStorage.removeItem('taskly_token');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (credentials: LoginCredentials) => {
    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('taskly_token', data.token);
        set({ user: data.user, currentView: 'boards' });
        await get().loadBoards();
      } else {
        set({ error: data.error });
      }
    } catch (error) {
      set({ error: 'Network error. Please try again.' });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (credentials: SignUpCredentials) => {
    if (credentials.password !== credentials.confirmPassword) {
      set({ error: 'Passwords do not match' });
      return;
    }

    try {
      set({ isLoading: true, error: null });
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('taskly_token', data.token);
        set({ user: data.user, currentView: 'boards' });
        await get().loadBoards();
      } else {
        set({ error: data.error });
      }
    } catch (error) {
      set({ error: 'Network error. Please try again.' });
    } finally {
      set({ isLoading: false });
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
      selectedCard: null,
    });
  },

  setAuthMode: (mode: 'login' | 'signup') => set({ authMode: mode }),
  clearError: () => set({ error: null }),

  // UI State methods
  setCurrentView: (view: ViewMode) => set({ currentView: view }),
  setSelectedBoardId: (id: string | null) => set({ selectedBoardId: id }),
  setSelectedCardId: (id: string | null) => {
    const card = id ? get().cards.find(c => c.id === id) || null : null;
    set({ selectedCardId: id, selectedCard: card });
  },
  selectCard: (card: Card | null) => set({ selectedCard: card, selectedCardId: card?.id || null }),
  setView: (view: ViewMode) => set({ currentView: view }),

  // Board operations
  loadBoards: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const boards = await getUserBoards(user.id);
      set({ boards });
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  },

  createBoard: async (form: CreateBoardForm) => {
    const { user, boards } = get();
    if (!user) return;

    try {
      const order = Math.max(...boards.map(b => b.order), 0) + 1;
      const board = await cosmicCreateBoard(form.title, user.id, order);
      set({ boards: [...boards, board] });
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  },

  updateBoard: async (id: string, updates: Partial<Board>) => {
    try {
      // Update in Cosmic
      await cosmicUpdateBoard(id, updates);
      // Update local state
      const { boards } = get();
      const updatedBoards = boards.map(board => 
        board.id === id ? { ...board, ...updates } : board
      );
      set({ boards: updatedBoards });
    } catch (error) {
      console.error('Failed to update board:', error);
    }
  },

  deleteBoard: async (id: string) => {
    try {
      await cosmicDeleteBoard(id);
      const { boards, columns, cards } = get();
      set({
        boards: boards.filter(b => b.id !== id),
        columns: columns.filter(c => c.boardId !== id),
        cards: cards.filter(c => c.boardId !== id),
      });
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  },

  getSelectedBoard: () => {
    const { boards, selectedBoardId } = get();
    return selectedBoardId ? boards.find(b => b.id === selectedBoardId) || null : null;
  },

  // Column operations
  loadColumns: async (boardId: string) => {
    try {
      const columns = await getBoardColumns(boardId);
      set(state => ({
        columns: [...state.columns.filter(c => c.boardId !== boardId), ...columns]
      }));
    } catch (error) {
      console.error('Failed to load columns:', error);
    }
  },

  createColumn: async (boardId: string, form: CreateColumnForm) => {
    try {
      const { columns } = get();
      const boardColumns = columns.filter(c => c.boardId === boardId);
      const order = form.order || Math.max(...boardColumns.map(c => c.order), 0) + 1;
      const column = await cosmicCreateColumn(boardId, form.title, order);
      set({ columns: [...columns, column] });
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  },

  updateColumn: async (id: string, updates: Partial<Column>) => {
    try {
      await cosmicUpdateColumn(id, updates);
      const { columns } = get();
      const updatedColumns = columns.map(column => 
        column.id === id ? { ...column, ...updates } : column
      );
      set({ columns: updatedColumns });
    } catch (error) {
      console.error('Failed to update column:', error);
    }
  },

  deleteColumn: async (id: string) => {
    try {
      await cosmicDeleteColumn(id);
      const { columns, cards } = get();
      set({
        columns: columns.filter(c => c.id !== id),
        cards: cards.filter(c => c.columnId !== id),
      });
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  },

  getColumnsByBoardId: (boardId: string) => {
    const { columns } = get();
    return columns.filter(c => c.boardId === boardId);
  },

  // Card operations
  loadCards: async (boardId: string) => {
    try {
      const cards = await getBoardCards(boardId);
      set(state => ({
        cards: [...state.cards.filter(c => c.boardId !== boardId), ...cards]
      }));
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  },

  createCard: async (boardId: string, columnId: string, form: EditCardForm) => {
    try {
      const { cards } = get();
      const columnCards = cards.filter(c => c.columnId === columnId);
      const order = form.order || Math.max(...columnCards.map(c => c.order), 0) + 1;
      
      const card = await cosmicCreateCard(
        boardId,
        columnId,
        form.title,
        form.description,
        form.labels,
        form.dueDate,
        order
      );
      set({ cards: [...cards, card] });
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  },

  addCard: async (boardId: string, columnId: string, form: EditCardForm) => {
    return get().createCard(boardId, columnId, form);
  },

  updateCard: async (id: string, updates: Partial<EditCardForm>) => {
    try {
      await cosmicUpdateCard(id, updates);
      const { cards } = get();
      const updatedCards = cards.map(card => 
        card.id === id ? { ...card, ...updates } : card
      );
      set({ cards: updatedCards });
    } catch (error) {
      console.error('Failed to update card:', error);
    }
  },

  deleteCard: async (id: string) => {
    try {
      await cosmicDeleteCard(id);
      const { cards } = get();
      set({ cards: cards.filter(c => c.id !== id) });
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  },

  getCardsByColumnId: (columnId: string) => {
    const { cards } = get();
    return cards.filter(c => c.columnId === columnId);
  },
}));

// Add a missing import function for updateBoard
const cosmicUpdateBoard = async (id: string, updates: Partial<Board>) => {
  const { updateBoard } = await import('@/lib/cosmic');
  return updateBoard(id, updates);
};