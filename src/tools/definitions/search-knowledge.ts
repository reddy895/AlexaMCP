import { z } from "zod";
import type { ToolDefinition } from "../registry.js";
import type { IRetrievalEngine } from "../../retrieval/search.js";

export const SearchKnowledgeInputSchema = z.object({
  query: z.string().min(1).describe("The search query or keyword phrase to find in local knowledge."),
  limit: z.number().int().min(1).max(20).optional().default(5).describe("Maximum number of matching excerpts to return."),
});

export function createSearchKnowledgeTool(retrievalEngine: IRetrievalEngine): ToolDefinition {
  return {
    name: "search_knowledge",
    description:
      "Search indexed local documentation, project specs, and knowledge files for relevant excerpts and evidence.",
    parameters: SearchKnowledgeInputSchema,
    effectClass: "read_only",
    requiresConfirmation: false,
    execute: async (args: z.infer<typeof SearchKnowledgeInputSchema>) => {
      const results = await retrievalEngine.search(args.query, args.limit);
      const citations = retrievalEngine.toCitations(results);

      return {
        query: args.query,
        count: results.length,
        results: results.map((r) => ({
          id: r.id,
          sourceId: r.sourceId,
          title: r.title,
          excerpt: r.content,
          score: Math.round(r.score * 100) / 100,
        })),
        citations,
        summary: `Found ${results.length} relevant excerpts for query "${args.query}".`,
      };
    },
  };
}
