import { createBucketClient } from '@cosmicjs/sdk';
import { User, Board, Column, Card } from '@/types';

// Initialize Cosmic client
const cosmic = createBucketClient({
  bucketSlug: process.env.COSMIC_BUCKET_SLUG as string,
  readKey: process.env.COSMIC_READ_KEY as string,
  writeKey: process.env.COSMIC_WRITE_KEY as string,
});

// Type guard to check if an error has a status property
const hasStatus = (error: any): error is { status: number } => {
  return error && typeof error.status === 'number';
};

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const response = await cosmic.objects
      .find({ type: 'users', 'metadata.email': email })
      .props(['id', 'title', 'slug', 'metadata'])
      .limit(1);
    
    return response.objects.length > 0 ? response.objects[0] as User : null;
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createUser = async (email: string, passwordHash: string): Promise<User> => {
  const response = await cosmic.objects.insertOne({
    title: email,
    type: 'users',
    metadata: {
      email,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    },
  });
  
  return response.object as User;
};

// Board operations
export const getUserBoards = async (userId: string): Promise<Board[]> => {
  try {
    const response = await cosmic.objects
      .find({ type: 'boards', 'metadata.user_id': userId })
      .props(['id', 'title', 'metadata'])
      .depth(1);
    
    return response.objects.map(obj => ({
      id: obj.id,
      title: obj.title,
      order: obj.metadata.order,
      isArchived: obj.metadata.is_archived || false,
      userId: obj.metadata.user_id,
    })) as Board[];
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const createBoard = async (title: string, userId: string, order: number): Promise<Board> => {
  const response = await cosmic.objects.insertOne({
    title,
    type: 'boards',
    metadata: {
      user_id: userId,
      order,
      is_archived: false,
    },
  });
  
  return {
    id: response.object.id,
    title: response.object.title,
    order: response.object.metadata.order,
    isArchived: response.object.metadata.is_archived || false,
    userId: response.object.metadata.user_id,
  };
};

export const updateBoard = async (id: string, updates: Partial<Pick<Board, 'title' | 'isArchived' | 'order'>>): Promise<void> => {
  const metadata: any = {};
  
  if (updates.order !== undefined) metadata.order = updates.order;
  if (updates.isArchived !== undefined) metadata.is_archived = updates.isArchived;
  
  await cosmic.objects.updateOne(id, {
    ...(updates.title && { title: updates.title }),
    ...(Object.keys(metadata).length > 0 && { metadata }),
  });
};

export const deleteBoard = async (id: string): Promise<void> => {
  await cosmic.objects.deleteOne(id);
};

// Column operations
export const getBoardColumns = async (boardId: string): Promise<Column[]> => {
  try {
    const response = await cosmic.objects
      .find({ type: 'columns', 'metadata.board_id': boardId })
      .props(['id', 'title', 'metadata'])
      .depth(1);
    
    return response.objects.map(obj => ({
      id: obj.id,
      title: obj.title,
      boardId: obj.metadata.board_id,
      order: obj.metadata.order,
    })) as Column[];
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const createColumn = async (boardId: string, title: string, order: number): Promise<Column> => {
  const response = await cosmic.objects.insertOne({
    title,
    type: 'columns',
    metadata: {
      board_id: boardId,
      order,
    },
  });
  
  return {
    id: response.object.id,
    title: response.object.title,
    boardId: response.object.metadata.board_id,
    order: response.object.metadata.order,
  };
};

export const updateColumn = async (id: string, updates: Partial<Pick<Column, 'title' | 'order'>>): Promise<void> => {
  const metadata: any = {};
  
  if (updates.order !== undefined) metadata.order = updates.order;
  
  await cosmic.objects.updateOne(id, {
    ...(updates.title && { title: updates.title }),
    ...(Object.keys(metadata).length > 0 && { metadata }),
  });
};

export const deleteColumn = async (id: string): Promise<void> => {
  await cosmic.objects.deleteOne(id);
};

// Card operations
export const getColumnCards = async (columnId: string): Promise<Card[]> => {
  try {
    const response = await cosmic.objects
      .find({ type: 'cards', 'metadata.column_id': columnId })
      .props(['id', 'title', 'metadata'])
      .depth(1);
    
    return response.objects.map(obj => ({
      id: obj.id,
      title: obj.title,
      boardId: obj.metadata.board_id,
      columnId: obj.metadata.column_id,
      description: obj.metadata.description,
      labels: obj.metadata.labels ? obj.metadata.labels.split(',').filter(Boolean) : undefined,
      dueDate: obj.metadata.due_date,
      order: obj.metadata.order,
      isArchived: obj.metadata.is_archived || false,
    })) as Card[];
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const getBoardCards = async (boardId: string): Promise<Card[]> => {
  try {
    const response = await cosmic.objects
      .find({ type: 'cards', 'metadata.board_id': boardId })
      .props(['id', 'title', 'metadata'])
      .depth(1);
    
    return response.objects.map(obj => ({
      id: obj.id,
      title: obj.title,
      boardId: obj.metadata.board_id,
      columnId: obj.metadata.column_id,
      description: obj.metadata.description,
      labels: obj.metadata.labels ? obj.metadata.labels.split(',').filter(Boolean) : undefined,
      dueDate: obj.metadata.due_date,
      order: obj.metadata.order,
      isArchived: obj.metadata.is_archived || false,
    })) as Card[];
  } catch (error) {
    if (hasStatus(error) && error.status === 404) {
      return [];
    }
    throw error;
  }
};

export const createCard = async (
  boardId: string,
  columnId: string,
  title: string,
  description?: string,
  labels?: string[],
  dueDate?: string,
  order: number = 100
): Promise<Card> => {
  const response = await cosmic.objects.insertOne({
    title,
    type: 'cards',
    metadata: {
      board_id: boardId,
      column_id: columnId,
      description: description || '',
      labels: labels ? labels.join(',') : '',
      due_date: dueDate || '',
      order,
      is_archived: false,
    },
  });
  
  return {
    id: response.object.id,
    title: response.object.title,
    boardId: response.object.metadata.board_id,
    columnId: response.object.metadata.column_id,
    description: response.object.metadata.description,
    labels: response.object.metadata.labels ? response.object.metadata.labels.split(',').filter(Boolean) : undefined,
    dueDate: response.object.metadata.due_date,
    order: response.object.metadata.order,
    isArchived: response.object.metadata.is_archived || false,
  };
};

export const updateCard = async (
  id: string, 
  updates: Partial<Pick<Card, 'title' | 'description' | 'labels' | 'dueDate' | 'isArchived' | 'columnId' | 'order'>>
): Promise<void> => {
  const metadata: any = {};
  
  if (updates.description !== undefined) metadata.description = updates.description || '';
  if (updates.labels !== undefined) metadata.labels = updates.labels ? updates.labels.join(',') : '';
  if (updates.dueDate !== undefined) metadata.due_date = updates.dueDate || '';
  if (updates.isArchived !== undefined) metadata.is_archived = updates.isArchived;
  if (updates.columnId !== undefined) metadata.column_id = updates.columnId;
  if (updates.order !== undefined) metadata.order = updates.order;
  
  await cosmic.objects.updateOne(id, {
    ...(updates.title && { title: updates.title }),
    ...(Object.keys(metadata).length > 0 && { metadata }),
  });
};

export const deleteCard = async (id: string): Promise<void> => {
  await cosmic.objects.deleteOne(id);
};