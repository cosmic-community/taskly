import type { DragStartEvent as DndDragStartEvent, DragEndEvent as DndDragEndEvent } from '@dnd-kit/core';

// Base entity interface
interface BaseEntity {
  id: string;
  order: number;
}

// Board interface
export interface Board extends BaseEntity {
  title: string;
  isArchived: boolean;
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

// App state interface
export interface AppState {
  boards: Board[];
  columns: Column[];
  cards: Card[];
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
export type ViewMode = 'boards' | 'board' | 'card';

export interface UIState {
  currentView: ViewMode;
  selectedBoardId: string | null;
  selectedCardId: string | null;
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
}

// Utility types
export type EntityType = 'board' | 'column' | 'card';

// Storage interface
export interface StorageService {
  loadData(): AppState;
  saveData(data: AppState): void;
  clearData(): void;
}