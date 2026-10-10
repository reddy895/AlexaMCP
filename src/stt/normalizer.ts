/**
 * Text normalizer and speech-to-text transcript post-processor.
 * Cleans audio hallucinations, normalizes spoken web URLs,
 * and strips assistant wake phrases.
 */

export function cleanTranscript(raw: string): string {
  if (!raw) return "";

  let cleaned = raw
    // Remove Whisper audio tags: [BLANK_AUDIO], (music), [applause], etc.
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\([^\)]+\)/g, " ")
    // Remove repetitive filler words at word boundaries
    .replace(/\b(um|uh|er|ah)\b/gi, " ")
    // Clean excess whitespace
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common speech-to-text punctuation spacing
  cleaned = cleaned
    .replace(/\s+([,\.!\?;:])/g, "$1")
    .replace(/([,\.!\?;:])([A-Za-z])/g, "$1 $2");

  return cleaned;
}

/**
 * Strips common assistant wake triggers if uttered at sentence start.
 * e.g. "Alexa, check this link..." -> "check this link..."
 * e.g. "Hey Detective, is this a scam?" -> "is this a scam?"
 * Note: If the entire utterance was just the greeting (e.g. "Hello Detective"),
 * preserves the utterance so it can be handled by the conversational greeting intent.
 */
export function stripWakeWords(text: string): string {
  const stripped = text
    .replace(/^(hey|hi|hello|ok|okay)?\s*(alexa|detective|digital detective)\s*[,:]?\s*/i, "")
    .trim();
  return stripped || text.trim();
}

/**
 * Normalizes speech representations of URLs into standard URL syntax.
 * e.g. "http colon slash slash scam dot xyz slash login" -> "http://scam.xyz/login"
 */
export function normalizeSpokenUrls(text: string): string {
  let res = text
    .replace(/\bcolon slash slash\b/gi, "://")
    .replace(/\bdot com\b/gi, ".com")
    .replace(/\bdot org\b/gi, ".org")
    .replace(/\bdot net\b/gi, ".net")
    .replace(/\bdot xyz\b/gi, ".xyz")
    .replace(/\bdot io\b/gi, ".io")
    .replace(/\bdot in\b/gi, ".in")
    .replace(/\bdot ai\b/gi, ".ai")
    .replace(/\bslash\b/gi, "/");

  // Fix spaces introduced inside protocol and domain parts
  res = res.replace(/(https?)\s*:\/\/\s*/gi, "$1://");
  res = res.replace(/(\w+)\s*(\.(?:com|org|net|xyz|io|in|ai|gov|edu))\b/gi, "$1$2");
  res = res.replace(/(\S+)\s*\/\s*(\S+)/g, "$1/$2");

  return res;
}

/**
 * Determines whether the transcribed text is just background noise, Whisper hallucination, or meaningless filler.
 */
export function isNoiseOnly(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase().trim();
  if (
    lower === "[blank_audio]" ||
    lower === "[silence]" ||
    lower === "silence" ||
    lower === "[ silence ]" ||
    lower.includes("blank_audio") ||
    lower.includes("[silence]") ||
    lower.includes("[ silence ]")
  ) {
    return true;
  }

  const cleaned = cleanTranscript(text);
  if (!cleaned) return true;
  if (cleaned.length < 2) return true;

  // Single punctuation or generic symbols
  if (/^[.\-_~,?!]+$/.test(cleaned)) return true;

  const noisePhrases = [
    "thank you",
    "thanks for watching",
    "subtitles by",
    "you",
    "bye",
    "silence",
  ];
  return noisePhrases.includes(cleaned.toLowerCase()) && cleaned.length < 10;
}
