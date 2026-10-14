import type { SQLiteDatabase } from "../storage/database.js";
import type { Citation } from "../core/types.js";
import { extractSearchTokens } from "./chunker.js";

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

export class LexicalSearchEngine implements IRetrievalEngine {
  constructor(private readonly db: SQLiteDatabase) {}

  public async search(query: string, limit = 5): Promise<SearchResultItem[]> {
    const rawTokens = extractSearchTokens(query).split(" ").filter((t) => t.length >= 2);
    if (rawTokens.length === 0) {
      return [];
    }

    // Query chunks matching any token
    const conditions = rawTokens.map(() => "(c.tokens LIKE ? OR d.path LIKE ?)").join(" OR ");
    const params: any[] = [];
    for (const token of rawTokens) {
      params.push(`%${token}%`, `%${token}%`);
    }

    const sql = `
      SELECT
        c.id,
        c.content,
        c.tokens,
        c.chunk_index,
        d.id as doc_id,
        d.path
      FROM document_chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE ${conditions}
      LIMIT 100;
    `;

    const rows = this.db.prepare(sql).all(...params) as Array<{
      id: string;
      content: string;
      tokens: string;
      chunk_index: number;
      doc_id: string;
      path: string;
    }>;

    if (rows.length === 0) {
      return [];
    }

    // Calculate BM25-style relevance score
    const scored: SearchResultItem[] = [];

    for (const row of rows) {
      const chunkTokens = new Set(row.tokens.split(" "));
      const pathLower = row.path.toLowerCase();

      let matchedTerms = 0;
      let termFrequencySum = 0;

      for (const token of rawTokens) {
        if (chunkTokens.has(token)) {
          matchedTerms++;
          // Count occurrences in content
          const count = (row.content.toLowerCase().match(new RegExp(`\\b${token}\\b`, "g")) || []).length;
          termFrequencySum += Math.max(1, count);
        } else if (pathLower.includes(token)) {
          matchedTerms += 0.5;
          termFrequencySum += 1;
        }
      }

      if (matchedTerms === 0) continue;

      // Coverage ratio (how many distinct query terms matched)
      const coverage = matchedTerms / rawTokens.length;
      // Frequency factor
      const tfFactor = Math.log(1 + termFrequencySum);
      // Path relevance bonus
      const pathBonus = pathLower.includes(rawTokens[0]) ? 1.3 : 1.0;

      const rawScore = (coverage * 0.7 + Math.min(tfFactor, 1.0) * 0.3) * pathBonus;
      const normalizedScore = Math.min(1.0, Math.max(0.1, Math.round(rawScore * 100) / 100));

      scored.push({
        id: row.id,
        sourceId: row.path,
        title: row.path,
        content: row.content,
        score: normalizedScore,
      });
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  public toCitations(results: SearchResultItem[]): Citation[] {
    return results.map((r) => ({
      sourceId: r.sourceId,
      title: r.title,
      excerpt: r.content.slice(0, 250),
      score: r.score,
    }));
  }
}
