export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  tokens: string;
}

export function extractSearchTokens(text: string): string {
  // Normalize, lowercase, remove punctuation, strip common stopwords
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .join(" ");
}

export function chunkText(
  text: string,
  options: ChunkOptions = {}
): DocumentChunk[] {
  const chunkSize = options.chunkSize ?? 1000;
  const chunkOverlap = options.chunkOverlap ?? 200;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanText = text.replace(/\r\n/g, "\n");
  const chunks: DocumentChunk[] = [];

  let start = 0;
  let chunkIndex = 0;

  while (start < cleanText.length) {
    let end = start + chunkSize;

    // If not at end of text, try to break cleanly on a paragraph or sentence boundary
    if (end < cleanText.length) {
      const naturalBreak = cleanText.lastIndexOf("\n\n", end);
      if (naturalBreak > start + chunkSize / 2) {
        end = naturalBreak;
      } else {
        const sentenceBreak = cleanText.lastIndexOf(". ", end);
        if (sentenceBreak > start + chunkSize / 2) {
          end = sentenceBreak + 1;
        }
      }
    } else {
      end = cleanText.length;
    }

    const chunkContent = cleanText.slice(start, end).trim();
    if (chunkContent.length > 0) {
      chunks.push({
        chunkIndex,
        content: chunkContent,
        tokens: extractSearchTokens(chunkContent),
      });
      chunkIndex++;
    }

    if (end >= cleanText.length) {
      break;
    }

    start = Math.max(start + 1, end - chunkOverlap);
  }

  return chunks;
}
