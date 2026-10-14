import type { Citation } from "../core/types.js";

export interface SearchResultItem {
  id: string;
  sourceId: string;
  title: string;
  content: string;
  score: number;
}

export interface IRetrievalEngine {
  search(query: string, limit?: number): Promise<SearchResultItem[]>;
  toCitations(results: SearchResultItem[]): Citation[];
}
