import { calculateAudioEnergy, trimSilence } from "../src/stt/silence.js";
import { generateTone, createWavHeader } from "../src/audio/tones.js";
import assert from "node:assert";

console.log("=== Testing Audio Silence Detection & Trimming ===");

// 1. Completely silent WAV
const silentPcm = Buffer.alloc(32000); // 1 sec of zeroes
const silentWav = Buffer.concat([createWavHeader(32000, 16000), silentPcm]);
const silentStats = calculateAudioEnergy(silentWav);
assert.strictEqual(silentStats.rms, 0, "Silent buffer must have 0 RMS");
assert.strictEqual(silentStats.isSilent, true, "Silent buffer must be flagged as silent");
console.log("✓ Zero-energy silence detection verified");

// 2. Active audio tone
const activeTone = generateTone(440, 1000, { volume: 0.8 });
const activeStats = calculateAudioEnergy(activeTone);
assert.ok(activeStats.rms > 1000, `Active audio RMS (${activeStats.rms}) must be well above threshold`);
assert.strictEqual(activeStats.isSilent, false, "Active audio must not be flagged as silent");
console.log(`✓ Active speech/tone energy verified (RMS: ${activeStats.rms})`);

// 3. Audio trimming with padding
// Construct: 500ms silence + 500ms tone + 500ms silence
const halfSecSilence = Buffer.alloc(16000); // 500ms at 16kHz
const tone500Pcm = generateTone(440, 500, { volume: 0.8 }).subarray(44);
const paddedPcm = Buffer.concat([halfSecSilence, tone500Pcm, halfSecSilence]);
const paddedWav = Buffer.concat([createWavHeader(paddedPcm.length, 16000), paddedPcm]);

const trimmedWav = trimSilence(paddedWav, 250, 50);
assert.ok(trimmedWav.length < paddedWav.length, "Trimmed WAV should be shorter than padded WAV");
assert.ok(trimmedWav.length >= tone500Pcm.length, "Trimmed WAV must retain active tone");
console.log(`✓ Silence trimming reduced size from ${paddedWav.length} to ${trimmedWav.length} bytes`);

console.log("=== All Silence Detection Tests Passed ===");
