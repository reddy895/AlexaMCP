import type { Citation } from "../core/types.js";

export class CitationBuilder {
  private citations: Map<string, Citation> = new Map();

  public addCitation(citation: Citation): this {
    const key = `${citation.sourceId}::${citation.location ?? ""}`;
    if (!this.citations.has(key)) {
      this.citations.set(key, citation);
    }
    return this;
  }

  public addBatch(citations: Citation[]): this {
    for (const c of citations) {
      this.addCitation(c);
    }
    return this;
  }

  public getCitations(): Citation[] {
    return Array.from(this.citations.values());
  }

  public formatMarkdownSources(): string {
    const list = this.getCitations();
    if (list.length === 0) return "";

    const lines: string[] = ["\n\n### Sources & Evidence:"];
    list.forEach((c, idx) => {
      const loc = c.location ? ` (${c.location})` : "";
      lines.push(`${idx + 1}. **${c.title}**${loc}: "${c.excerpt.slice(0, 200)}..."`);
    });
    return lines.join("\n");
  }
}
