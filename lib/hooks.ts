'use client';

import { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { 
  AppState, 
  UIState, 
  ViewMode, 
  User, 
  Board, 
  Column, 
  Card, 
  LoginCredentials, 
  SignUpCredentials,
  CreateBoardForm,
  CreateColumnForm,
  CreateCardForm,
  EditCardForm,
  DragEndEvent 
} from '@/types';

// Auth service for API calls
class AuthService {
  private baseUrl = '/api/auth';

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await fetch(`${this.baseUrl}/login`, {
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
  }

  async signUp(credentials: SignUpCredentials): Promise<{ user: User; token: string }> {
    if (credentials.password !== credentials.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    const response = await fetch(`${this.baseUrl}/signup`, {
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
  }

  async verifyToken(token: string): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Token verification failed');
    }

    return response.json();
  }
}

// API service for board operations
class ApiService {
  private baseUrl = '/api';
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request(url: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Board operations
  async getBoards(): Promise<Board[]> {
    return this.request(`${this.baseUrl}/boards`);
  }

  async createBoard(data: CreateBoardForm): Promise<Board> {
    return this.request(`${this.baseUrl}/boards`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBoard(id: string, updates: Partial<Board>): Promise<void> {
    await this.request(`${this.baseUrl}/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteBoard(id: string): Promise<void> {
    await this.request(`${this.baseUrl}/boards/${id}`, {
      method: 'DELETE',
    });
  }

  // Column operations
  async getColumns(boardId: string): Promise<Column[]> {
    return this.request(`${this.baseUrl}/columns?boardId=${boardId}`);
  }

  async createColumn(data: CreateColumnForm & { boardId: string }): Promise<Column> {
    return this.request(`${this.baseUrl}/columns`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateColumn(id: string, updates: Partial<Column>): Promise<void> {
    await this.request(`${this.baseUrl}/columns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteColumn(id: string): Promise<void> {
    await this.request(`${this.baseUrl}/columns/${id}`, {
      method: 'DELETE',
    });
  }

  async reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
    await this.request(`${this.baseUrl}/columns/reorder`, {
      method: 'POST',
      body: JSON.stringify({ boardId, columnIds }),
    });
  }

  // Card operations
  async getCards(boardId: string): Promise<Card[]> {
    return this.request(`${this.baseUrl}/cards?boardId=${boardId}`);
  }

  async createCard(data: CreateCardForm & { boardId: string; columnId: string }): Promise<Card> {
    return this.request(`${this.baseUrl}/cards`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCard(id: string, updates: Partial<EditCardForm>): Promise<void> {
    await this.request(`${this.baseUrl}/cards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async moveCard(id: string, columnId: string, order: number): Promise<void> {
    await this.request(`${this.baseUrl}/cards/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ columnId, order }),
    });
  }

  async deleteCard(id: string): Promise<void> {
    await this.request(`${this.baseUrl}/cards/${id}`, {
      method: 'DELETE',
    });
  }
}

// Storage service for local state
class StorageService {
  private readonly TOKEN_KEY = 'taskly_auth_token';

  saveToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }
}

// Taskly hook context and state management
interface TasklyContextValue {
  // State
  appState: AppState;
  uiState: UIState;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  login: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: SignUpCredentials) => Promise<void>;
  logout: () => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  clearError: () => void;

  // UI navigation
  setCurrentView: (view: ViewMode) => void;
  selectBoard: (boardId: string | null) => void;
  selectCard: (cardId: string | null) => void;

  // Board operations
  loadBoards: () => Promise<void>;
  createBoard: (data: CreateBoardForm) => Promise<void>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;

  // Column operations
  loadColumns: (boardId: string) => Promise<void>;
  createColumn: (boardId: string, data: CreateColumnForm) => Promise<void>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  // Card operations
  loadCards: (boardId: string) => Promise<void>;
  createCard: (boardId: string, columnId: string, data: CreateCardForm) => Promise<void>;
  updateCard: (id: string, updates: Partial<EditCardForm>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // Drag and drop
  handleDragEnd: (event: DragEndEvent) => Promise<void>;

  // Utilities
  getBoardById: (id: string) => Board | undefined;
  getColumnById: (id: string) => Column | undefined;
  getCardById: (id: string) => Card | undefined;
  getBoardColumns: (boardId: string) => Column[];
  getColumnCards: (columnId: string) => Card[];
}

const TasklyContext = createContext<TasklyContextValue | null>(null);

export function TasklyProvider({ children }: { children: React.ReactNode }) {
  // Services
  const authService = new AuthService();
  const apiService = new ApiService();
  const storageService = new StorageService();

  // State
  const [appState, setAppState] = useState<AppState>({
    boards: [],
    columns: [],
    cards: [],
    user: null,
  });

  const [uiState, setUiState] = useState<UIState>({
    currentView: 'auth',
    selectedBoardId: null,
    selectedCardId: null,
    authMode: 'login',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = storageService.getToken();
      if (token) {
        try {
          setIsLoading(true);
          const { user } = await authService.verifyToken(token);
          apiService.setToken(token);
          setAppState(prev => ({ ...prev, user }));
          setUiState(prev => ({ ...prev, currentView: 'boards' }));
        } catch (error) {
          // Token is invalid, remove it
          storageService.removeToken();
          setUiState(prev => ({ ...prev, currentView: 'auth' }));
        } finally {
          setIsLoading(false);
        }
      }
    };

    initAuth();
  }, []);

  // Error handling
  const handleError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'An error occurred';
    setError(message);
    setIsLoading(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auth methods
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const { user, token } = await authService.login(credentials);
      storageService.saveToken(token);
      apiService.setToken(token);
      setAppState(prev => ({ ...prev, user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    try {
      setIsLoading(true);
      setError(null);
      const { user, token } = await authService.signUp(credentials);
      storageService.saveToken(token);
      apiService.setToken(token);
      setAppState(prev => ({ ...prev, user }));
      setUiState(prev => ({ ...prev, currentView: 'boards' }));
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const logout = useCallback(() => {
    storageService.removeToken();
    apiService.setToken(null);
    setAppState({
      boards: [],
      columns: [],
      cards: [],
      user: null,
    });
    setUiState({
      currentView: 'auth',
      selectedBoardId: null,
      selectedCardId: null,
      authMode: 'login',
    });
    setError(null);
  }, []);

  const setAuthMode = useCallback((mode: 'login' | 'signup') => {
    setUiState(prev => ({ ...prev, authMode: mode }));
    setError(null);
  }, []);

  // UI navigation
  const setCurrentView = useCallback((view: ViewMode) => {
    setUiState(prev => ({ ...prev, currentView: view }));
  }, []);

  const selectBoard = useCallback((boardId: string | null) => {
    setUiState(prev => ({ 
      ...prev, 
      selectedBoardId: boardId,
      currentView: boardId ? 'board' : 'boards',
      selectedCardId: null 
    }));
  }, []);

  const selectCard = useCallback((cardId: string | null) => {
    setUiState(prev => ({ 
      ...prev, 
      selectedCardId: cardId,
      currentView: cardId ? 'card' : 'board'
    }));
  }, []);

  // Board operations
  const loadBoards = useCallback(async () => {
    try {
      setIsLoading(true);
      const boards = await apiService.getBoards();
      setAppState(prev => ({ ...prev, boards }));
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const createBoard = useCallback(async (data: CreateBoardForm) => {
    try {
      setIsLoading(true);
      const board = await apiService.createBoard(data);
      setAppState(prev => ({ 
        ...prev, 
        boards: [...prev.boards, board] 
      }));
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const updateBoard = useCallback(async (id: string, updates: Partial<Board>) => {
    try {
      await apiService.updateBoard(id, updates);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.map(board => 
          board.id === id ? { ...board, ...updates } : board
        ),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const deleteBoard = useCallback(async (id: string) => {
    try {
      await apiService.deleteBoard(id);
      setAppState(prev => ({
        ...prev,
        boards: prev.boards.filter(board => board.id !== id),
        columns: prev.columns.filter(column => column.boardId !== id),
        cards: prev.cards.filter(card => card.boardId !== id),
      }));
      
      // Navigate back to boards if this board was selected
      if (uiState.selectedBoardId === id) {
        setUiState(prev => ({ 
          ...prev, 
          selectedBoardId: null, 
          currentView: 'boards',
          selectedCardId: null
        }));
      }
    } catch (error) {
      handleError(error);
    }
  }, [handleError, uiState.selectedBoardId]);

  // Column operations
  const loadColumns = useCallback(async (boardId: string) => {
    try {
      const columns = await apiService.getColumns(boardId);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(c => c.boardId !== boardId).concat(columns),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const createColumn = useCallback(async (boardId: string, data: CreateColumnForm) => {
    try {
      const column = await apiService.createColumn({ ...data, boardId });
      setAppState(prev => ({
        ...prev,
        columns: [...prev.columns, column],
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const updateColumn = useCallback(async (id: string, updates: Partial<Column>) => {
    try {
      await apiService.updateColumn(id, updates);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.map(column => 
          column.id === id ? { ...column, ...updates } : column
        ),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const deleteColumn = useCallback(async (id: string) => {
    try {
      await apiService.deleteColumn(id);
      setAppState(prev => ({
        ...prev,
        columns: prev.columns.filter(column => column.id !== id),
        cards: prev.cards.filter(card => card.columnId !== id),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  // Card operations
  const loadCards = useCallback(async (boardId: string) => {
    try {
      const cards = await apiService.getCards(boardId);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(c => c.boardId !== boardId).concat(cards),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const createCard = useCallback(async (
    boardId: string, 
    columnId: string, 
    data: CreateCardForm
  ) => {
    try {
      const card = await apiService.createCard({ ...data, boardId, columnId });
      setAppState(prev => ({
        ...prev,
        cards: [...prev.cards, card],
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const updateCard = useCallback(async (id: string, updates: Partial<EditCardForm>) => {
    try {
      await apiService.updateCard(id, updates);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  const deleteCard = useCallback(async (id: string) => {
    try {
      await apiService.deleteCard(id);
      setAppState(prev => ({
        ...prev,
        cards: prev.cards.filter(card => card.id !== id),
      }));
    } catch (error) {
      handleError(error);
    }
  }, [handleError]);

  // Drag and drop handling
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (!activeData || !overData) return;

    try {
      // Handle card movement
      if (activeData.type === 'card') {
        const card = activeData.card as Card;
        
        if (overData.type === 'column') {
          // Moving card to a different column
          const targetColumn = overData.column as Column;
          const targetCards = appState.cards.filter(c => c.columnId === targetColumn.id);
          const newOrder = targetCards.length > 0 ? Math.max(...targetCards.map(c => c.order)) + 1 : 0;
          
          await apiService.moveCard(card.id, targetColumn.id, newOrder);
          
          setAppState(prev => ({
            ...prev,
            cards: prev.cards.map(c => 
              c.id === card.id 
                ? { ...c, columnId: targetColumn.id, order: newOrder }
                : c
            ),
          }));
        } else if (overData.type === 'card') {
          // Moving card to another card's position
          const targetCard = overData.card as Card;
          
          if (card.columnId === targetCard.columnId) {
            // Same column reordering
            const columnCards = appState.cards
              .filter(c => c.columnId === card.columnId && c.id !== card.id)
              .sort((a, b) => a.order - b.order);
            
            const targetIndex = columnCards.findIndex(c => c.id === targetCard.id);
            const newOrder = targetIndex === 0 
              ? targetCard.order / 2 
              : (columnCards[targetIndex - 1].order + targetCard.order) / 2;
            
            await apiService.moveCard(card.id, card.columnId, newOrder);
            
            setAppState(prev => ({
              ...prev,
              cards: prev.cards.map(c => 
                c.id === card.id ? { ...c, order: newOrder } : c
              ),
            }));
          } else {
            // Different column
            await apiService.moveCard(card.id, targetCard.columnId, targetCard.order);
            
            setAppState(prev => ({
              ...prev,
              cards: prev.cards.map(c => 
                c.id === card.id 
                  ? { ...c, columnId: targetCard.columnId, order: targetCard.order }
                  : c
              ),
            }));
          }
        }
      }
    } catch (error) {
      handleError(error);
    }
  }, [appState.cards, apiService, handleError]);

  // Utility methods
  const getBoardById = useCallback((id: string): Board | undefined => {
    return appState.boards.find(board => board.id === id);
  }, [appState.boards]);

  const getColumnById = useCallback((id: string): Column | undefined => {
    return appState.columns.find(column => column.id === id);
  }, [appState.columns]);

  const getCardById = useCallback((id: string): Card | undefined => {
    return appState.cards.find(card => card.id === id);
  }, [appState.cards]);

  const getBoardColumns = useCallback((boardId: string): Column[] => {
    return appState.columns
      .filter(column => column.boardId === boardId)
      .sort((a, b) => a.order - b.order);
  }, [appState.columns]);

  const getColumnCards = useCallback((columnId: string): Card[] => {
    return appState.cards
      .filter(card => card.columnId === columnId && !card.isArchived)
      .sort((a, b) => a.order - b.order);
  }, [appState.cards]);

  const contextValue: TasklyContextValue = {
    // State
    appState,
    uiState,
    isLoading,
    error,

    // Auth methods
    login,
    signUp,
    logout,
    setAuthMode,
    clearError,

    // UI navigation
    setCurrentView,
    selectBoard,
    selectCard,

    // Board operations
    loadBoards,
    createBoard,
    updateBoard,
    deleteBoard,

    // Column operations
    loadColumns,
    createColumn,
    updateColumn,
    deleteColumn,

    // Card operations
    loadCards,
    createCard,
    updateCard,
    deleteCard,

    // Drag and drop
    handleDragEnd,

    // Utilities
    getBoardById,
    getColumnById,
    getCardById,
    getBoardColumns,
    getColumnCards,
  };

  return (
    <TasklyContext.Provider value={contextValue}>
      {children}
    </TasklyContext.Provider>
  );
}

export function useTaskly(): TasklyContextValue {
  const context = useContext(TasklyContext);
  if (!context) {
    throw new Error('useTaskly must be used within a TasklyProvider');
  }
  return context;
}