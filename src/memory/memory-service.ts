export interface MemoryRecord {
  id: string;
  scope: string;
  userId?: string;
  key: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMemoryService {
  save(key: string, content: string, scope?: string, userId?: string): Promise<MemoryRecord>;
  get(key: string, scope?: string, userId?: string): Promise<MemoryRecord | null>;
  search(query: string, scope?: string, userId?: string): Promise<MemoryRecord[]>;
  delete(key: string, scope?: string, userId?: string): Promise<boolean>;
  list(scope?: string, userId?: string): Promise<MemoryRecord[]>;
}
