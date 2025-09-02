import type { DragStartEvent as DndDragStartEvent, DragEndEvent as DndDragEndEvent } from '@dnd-kit/core';

// Base entity interface
interface BaseEntity {
  id: string;
  order: number;
}

// User interface
export interface User {
  id: string;
  title: string;
  slug: string;
  metadata: {
    email: string;
    password_hash: string;
    created_at: string;
  };
}

// Board interface - now includes user association
export interface Board extends BaseEntity {
  title: string;
  isArchived: boolean;
  userId: string; // Associate boards with users
}

// Column interface
export interface Column extends BaseEntity {
  boardId: string;
  title: string;
}

// Card interface
export interface Card extends BaseEntity {
  boardId: string;
  columnId: string;
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string;
  isArchived: boolean;
}

// App state interface - now includes user
export interface AppState {
  boards: Board[];
  columns: Column[];
  cards: Card[];
  user: User | null;
}

// Authentication interfaces
export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

// Re-export DndKit types to avoid conflicts
export type DragStartEvent = DndDragStartEvent;
export type DragEndEvent = DndDragEndEvent;

// Custom drag data types for our application
export interface CardDragData {
  type: 'card';
  card: Card;
}

export interface ColumnDragData {
  type: 'column';
  column: Column;
}

export interface ColumnCardsDragData {
  type: 'column-cards';
  columnId: string;
}

export type DragData = CardDragData | ColumnDragData | ColumnCardsDragData;

// UI state types
export type ViewMode = 'auth' | 'boards' | 'board' | 'card';

export interface UIState {
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
  authMode: 'login' | 'signup';
}

// Form types
export interface CreateBoardForm {
  title: string;
}

export interface CreateColumnForm {
  title: string;
}

export interface CreateCardForm {
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string;
}

export interface EditCardForm extends CreateCardForm {
  id: string;
  isArchived?: boolean;
  columnId?: string;
}

// Utility types
export type EntityType = 'board' | 'column' | 'card' | 'user';

// Storage interface
export interface StorageService {
  loadData(): Promise<AppState>;
  saveData(data: AppState): Promise<void>;
  clearData(): void;
}