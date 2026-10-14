import type { Citation } from "../core/types.js";

export interface GroundingVerificationResult {
  groundedRatio: number;
  unverifiedTerms: string[];
}

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
      lines.push(`${idx + 1}. **${c.title}** [${c.sourceId}]${loc}: "${c.excerpt.slice(0, 200)}..."`);
    });
    return lines.join("\n");
  }

  public verifyGrounding(answerText: string): GroundingVerificationResult {
    const list = this.getCitations();
    if (list.length === 0) {
      return { groundedRatio: 0, unverifiedTerms: [] };
    }

    const citationText = list.map((c) => c.excerpt.toLowerCase()).join(" ");
    const answerWords = answerText
      .toLowerCase()
      .replace(/[^a-z0-9_\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4);

    if (answerWords.length === 0) {
      return { groundedRatio: 1.0, unverifiedTerms: [] };
    }

    let verifiedCount = 0;
    const unverified: string[] = [];

    for (const word of answerWords) {
      if (citationText.includes(word)) {
        verifiedCount++;
      } else {
        unverified.push(word);
      }
    }

    return {
      groundedRatio: Math.round((verifiedCount / answerWords.length) * 100) / 100,
      unverifiedTerms: Array.from(new Set(unverified)).slice(0, 10),
    };
  }
}
