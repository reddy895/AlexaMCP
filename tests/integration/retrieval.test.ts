import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SQLiteDatabase } from "../../src/storage/database.js";
import { runAllMigrations } from "../../src/storage/migrations/index.js";
import { chunkText, extractSearchTokens } from "../../src/retrieval/chunker.js";
import { extractDocumentMetadata, formatRelevantExcerpt } from "../../src/retrieval/metadata.js";
import { DocumentIndexer } from "../../src/retrieval/indexer.js";
import { LexicalSearchEngine } from "../../src/retrieval/search.js";
import { CitationBuilder } from "../../src/retrieval/citations.js";

describe("Retrieval Subsystem Tests", () => {
  let db: SQLiteDatabase;

  beforeEach(() => {
    db = new SQLiteDatabase({ inMemory: true });
    runAllMigrations(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("Chunker & Tokenizer", () => {
    it("splits long text into overlapping chunks", () => {
      const sampleText = "Paragraph 1 is here.\n\nParagraph 2 is right here.\n\nParagraph 3 is also here.";
      const chunks = chunkText(sampleText, { chunkSize: 30, chunkOverlap: 10 });
      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].tokens).toBeDefined();
    });

    it("extracts search tokens without punctuation", () => {
      const tokens = extractSearchTokens("Hello World! This is an API testing phrase.");
      expect(tokens).toContain("hello");
      expect(tokens).toContain("world");
      expect(tokens).toContain("api");
      expect(tokens).not.toContain("!");
    });
  });

  describe("Metadata & Excerpt Formatting", () => {
    it("extracts top headings as document title", () => {
      const markdown = "# Project Architecture\n\nSome intro.\n\n## Data Layer\nDetails.";
      const meta = extractDocumentMetadata(markdown, "docs/ARCH.md");
      expect(meta.title).toBe("Project Architecture");
      expect(meta.headings).toContain("Project Architecture");
      expect(meta.headings).toContain("Data Layer");
    });

    it("formats excerpt centered around matching query terms", () => {
      const text = "A long document intro begins here. The secret configuration port is 9090. Then follows outro.";
      const excerpt = formatRelevantExcerpt(text, "port 9090", 50);
      expect(excerpt).toContain("9090");
    });
  });

  describe("Indexer & Lexical Search Engine", () => {
    it("indexes documents incrementally and retrieves ranked results", async () => {
      const indexer = new DocumentIndexer(db);
      const searchEngine = new LexicalSearchEngine(db);

      const doc1 = {
        absolutePath: "/app/docs/server.md",
        relativePath: "docs/server.md",
        content: "The server uses Streamable HTTP transport on port 3001 with MCP protocol support.",
        sizeBytes: 100,
        mimeType: "text/markdown",
      };

      const doc2 = {
        absolutePath: "/app/docs/voice.md",
        relativePath: "docs/voice.md",
        content: "Voice synthesis uses edge-tts and spd-say with neural voices for spoken interaction.",
        sizeBytes: 100,
        mimeType: "text/markdown",
      };

      // 1. Initial indexing
      const res1 = indexer.indexDocument(doc1);
      const res2 = indexer.indexDocument(doc2);
      expect(res1).toBe(true);
      expect(res2).toBe(true);

      // 2. Incremental deduplication: indexing same doc again returns false
      const reindex = indexer.indexDocument(doc1);
      expect(reindex).toBe(false);

      // 3. Search for server transport
      const searchResults = await searchEngine.search("streamable http port", 5);
      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].sourceId).toBe("docs/server.md");
      expect(searchResults[0].score).toBeGreaterThan(0.5);

      // 4. Citation generation
      const citations = searchEngine.toCitations(searchResults);
      expect(citations[0].sourceId).toBe("docs/server.md");

      // 5. Grounding verification
      const builder = new CitationBuilder();
      builder.addBatch(citations);
      const grounding = builder.verifyGrounding("The server runs Streamable HTTP on port 3001.");
      expect(grounding.groundedRatio).toBeGreaterThan(0.5);
    });
  });
});
