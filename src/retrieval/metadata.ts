export interface DocumentMetadata {
  title: string;
  headings: string[];
  description?: string;
}

export function extractDocumentMetadata(content: string, filePath: string): DocumentMetadata {
  const headings: string[] = [];
  let title = filePath;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const headingText = trimmed.replace(/^#+\s*/, "").trim();
      headings.push(headingText);
      if (title === filePath) {
        title = headingText;
      }
    } else if (trimmed.startsWith("## ")) {
      headings.push(trimmed.replace(/^#+\s*/, "").trim());
    }
  }

  return {
    title,
    headings: headings.slice(0, 10),
  };
}

export function formatRelevantExcerpt(
  content: string,
  query: string,
  maxExcerptLength = 250
): string {
  if (!content) return "";
  if (!query || query.trim().length === 0) {
    return content.slice(0, maxExcerptLength) + (content.length > maxExcerptLength ? "..." : "");
  }

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const lowerContent = content.toLowerCase();
  let bestIdx = -1;

  for (const term of terms) {
    const idx = lowerContent.indexOf(term);
    if (idx !== -1) {
      bestIdx = idx;
      break;
    }
  }

  if (bestIdx === -1) {
    return content.slice(0, maxExcerptLength) + (content.length > maxExcerptLength ? "..." : "");
  }

  const start = Math.max(0, bestIdx - 15);
  const end = Math.min(content.length, start + maxExcerptLength);
  const prefix = start > 0 ? "... " : "";
  const suffix = end < content.length ? " ..." : "";

  return prefix + content.slice(start, end).trim() + suffix;
}
