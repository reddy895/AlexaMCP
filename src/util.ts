export function extractUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"')\]]+/g;
  return Array.from(new Set(text.match(re) ?? []));
}
