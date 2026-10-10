import { createWavHeader, generateTone, generateMelody } from "../src/audio/tones.js";
import assert from "node:assert";

console.log("=== Testing PCM Tone Generator ===");

// Test 1: WAV Header validation
const header = createWavHeader(3200, 16000, 1, 16);
assert.strictEqual(header.length, 44, "Header must be 44 bytes");
assert.strictEqual(header.toString("ascii", 0, 4), "RIFF");
assert.strictEqual(header.toString("ascii", 8, 12), "WAVE");
assert.strictEqual(header.toString("ascii", 12, 16), "fmt ");
assert.strictEqual(header.toString("ascii", 36, 40), "data");
console.log("✓ WAV Header structure valid");

// Test 2: Generate Pure Sine Wave Tone
const tone = generateTone(440, 250, { sampleRate: 16000, volume: 0.5 });
assert.ok(tone.length > 44, "WAV must have header and samples");
// 250ms at 16000 samples/sec = 4000 samples * 2 bytes = 8000 bytes PCM + 44 header = 8044 bytes
assert.strictEqual(tone.length, 8044, "Audio byte size matches expected PCM length");
console.log("✓ Pure tone generation matches duration and byte length");

// Test 3: Generate Multi-note Melody
const melody = generateMelody(
  [
    { freqHz: 523.25, durationMs: 100 }, // C5
    { freqHz: 659.25, durationMs: 100 }, // E5
    { freqHz: 783.99, durationMs: 150 }, // G5
  ],
  { sampleRate: 16000 }
);
// Total duration = 350ms -> 5600 samples * 2 = 11200 bytes PCM + 44 = 11244 bytes
assert.strictEqual(melody.length, 11244, "Melody length matches sum of note durations");
console.log("✓ Melodic chime generation valid");

console.log("=== All PCM Tone Tests Passed ===");
