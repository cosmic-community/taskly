import { nanoid } from 'nanoid';
import { AppState, Board, Column, Card } from '@/types';

const STORAGE_KEY = 'taskly-data';

// Default seed data
const createSeedData = (): AppState => {
  const boardId = nanoid();
  const todoColumnId = nanoid();
  const inProgressColumnId = nanoid();
  const doneColumnId = nanoid();

  const boards: Board[] = [
    {
      id: boardId,
      title: 'Personal Tasks',
      order: 100,
      isArchived: false,
    },
  ];

  const columns: Column[] = [
    {
      id: todoColumnId,
      boardId,
      title: 'To Do',
      order: 100,
    },
    {
      id: inProgressColumnId,
      boardId,
      title: 'In Progress',
      order: 200,
    },
    {
      id: doneColumnId,
      boardId,
      title: 'Done',
      order: 300,
    },
  ];

  const cards: Card[] = [
    {
      id: nanoid(),
      boardId,
      columnId: todoColumnId,
      title: 'Buy groceries',
      description: 'Get milk, bread, eggs, and vegetables',
      order: 100,
      isArchived: false,
    },
    {
      id: nanoid(),
      boardId,
      columnId: todoColumnId,
      title: 'Book dentist appointment',
      description: 'Schedule routine cleaning for next month',
      order: 200,
      isArchived: false,
    },
    {
      id: nanoid(),
      boardId,
      columnId: todoColumnId,
      title: 'Call mom',
      order: 300,
      isArchived: false,
    },
    {
      id: nanoid(),
      boardId,
      columnId: inProgressColumnId,
      title: 'Write blog post',
      description: 'Article about productivity tips and techniques',
      labels: ['writing', 'blog'],
      order: 100,
      isArchived: false,
    },
    {
      id: nanoid(),
      boardId,
      columnId: doneColumnId,
      title: 'Laundry',
      order: 100,
      isArchived: false,
    },
  ];

  return { boards, columns, cards };
};

// Storage service
export const storageService = {
  loadData(): AppState {
    if (typeof window === 'undefined') {
      return createSeedData();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const seedData = createSeedData();
        this.saveData(seedData);
        return seedData;
      }

      const parsed = JSON.parse(stored) as AppState;
      
      // Validate the data structure
      if (!parsed.boards || !parsed.columns || !parsed.cards) {
        const seedData = createSeedData();
        this.saveData(seedData);
        return seedData;
      }

      return parsed;
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
      const seedData = createSeedData();
      this.saveData(seedData);
      return seedData;
    }
  },

  saveData(data: AppState): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  },

  clearData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing data from localStorage:', error);
    }
  },
};

// Utility functions for order management
export const calculateNewOrder = (prevOrder?: number, nextOrder?: number): number => {
  if (prevOrder === undefined && nextOrder === undefined) {
    return 100;
  }
  if (prevOrder === undefined) {
    return nextOrder! - 100;
  }
  if (nextOrder === undefined) {
    return prevOrder + 100;
  }
  return Math.floor((prevOrder + nextOrder) / 2);
};

export const getNextOrder = (existingOrders: number[]): number => {
  if (existingOrders.length === 0) return 100;
  const maxOrder = Math.max(...existingOrders);
  return maxOrder + 100;
};