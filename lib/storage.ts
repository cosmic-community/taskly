import { nanoid } from 'nanoid';
import { AppState, Board, Column, Card, User } from '@/types';

export class LocalStorageService {
  private readonly STORAGE_KEY = 'taskly-app-state';

  async loadData(): Promise<AppState> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) {
        return this.getInitialState();
      }
      return JSON.parse(data);
    } catch {
      return this.getInitialState();
    }
  }

  private getInitialState(): AppState {
    const sampleBoard: Board = {
      id: nanoid(),
      title: 'Sample Project',
      order: 0,
      isArchived: false,
      userId: 'sample-user-id', // Add the required userId property
    };

    const todoColumn: Column = {
      id: nanoid(),
      boardId: sampleBoard.id,
      title: 'To Do',
      order: 0,
    };

    const inProgressColumn: Column = {
      id: nanoid(),
      boardId: sampleBoard.id,
      title: 'In Progress',
      order: 1,
    };

    const doneColumn: Column = {
      id: nanoid(),
      boardId: sampleBoard.id,
      title: 'Done',
      order: 2,
    };

    const sampleCards: Card[] = [
      {
        id: nanoid(),
        boardId: sampleBoard.id,
        columnId: todoColumn.id,
        title: 'Design user interface',
        description: 'Create wireframes and mockups for the main dashboard',
        labels: ['design', 'ui'],
        order: 0,
        isArchived: false,
      },
      {
        id: nanoid(),
        boardId: sampleBoard.id,
        columnId: todoColumn.id,
        title: 'Set up authentication',
        description: 'Implement user login and registration system',
        labels: ['backend', 'auth'],
        order: 1,
        isArchived: false,
      },
      {
        id: nanoid(),
        boardId: sampleBoard.id,
        columnId: inProgressColumn.id,
        title: 'Build API endpoints',
        description: 'Create REST API for board operations',
        labels: ['backend', 'api'],
        order: 0,
        isArchived: false,
      },
      {
        id: nanoid(),
        boardId: sampleBoard.id,
        columnId: doneColumn.id,
        title: 'Project setup',
        description: 'Initialize project structure and dependencies',
        labels: ['setup'],
        order: 0,
        isArchived: false,
      },
    ];

    return {
      boards: [sampleBoard],
      columns: [todoColumn, inProgressColumn, doneColumn],
      cards: sampleCards,
      user: null, // Add the required user property
    };
  }

  async saveData(data: AppState): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data to localStorage:', error);
      throw new Error('Failed to save data');
    }
  }

  clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const storageService = new LocalStorageService();