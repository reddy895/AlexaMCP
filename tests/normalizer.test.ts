import {
  cleanTranscript,
  stripWakeWords,
  normalizeSpokenUrls,
  isNoiseOnly,
} from "../src/stt/normalizer.js";
import assert from "node:assert";

console.log("=== Testing Speech Transcript Normalizer ===");

// 1. Clean transcript
const rawAudioTranscript = "[BLANK_AUDIO]  uh hello ,  can you help me ? (music)";
const cleaned = cleanTranscript(rawAudioTranscript);
assert.strictEqual(cleaned, "hello, can you help me?");
console.log("✓ Whisper tags and filler word cleaning verified");

// 2. Strip wake words
const withWake1 = "Alexa, is this message a scam?";
assert.strictEqual(stripWakeWords(withWake1), "is this message a scam?");

const withWake2 = "Hey Detective check http://test.com";
assert.strictEqual(stripWakeWords(withWake2), "check http://test.com");

const withoutWake = "What is the weather?";
assert.strictEqual(stripWakeWords(withoutWake), "What is the weather?");
console.log("✓ Wake word stripping verified");

// 3. Spoken URL normalization
const spokenUrl = "check http colon slash slash scam dot xyz slash login now";
const convertedUrl = normalizeSpokenUrls(spokenUrl);
assert.strictEqual(convertedUrl, "check http://scam.xyz/login now");
console.log("✓ Spoken URL phonetic conversion verified");

// 4. Noise filter
assert.strictEqual(isNoiseOnly(""), true);
assert.strictEqual(isNoiseOnly("[BLANK_AUDIO]"), true);
assert.strictEqual(isNoiseOnly("..."), true);
assert.strictEqual(isNoiseOnly("Hello world!"), false);
console.log("✓ Ambient noise filtering verified");

console.log("=== All Normalizer Tests Passed ===");
