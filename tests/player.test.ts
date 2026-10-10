import { AudioPlayer, defaultAudioPlayer } from "../src/audio/player.js";
import { generateTone } from "../src/audio/tones.js";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

console.log("=== Testing Audio Player Abstraction ===");

// 1. Detect backend
const backend = defaultAudioPlayer.getBackend();
console.log(`Detected default audio backend: ${backend}`);
assert.ok(
  ["pw-play", "aplay", "paplay", "mpv", "mock", "none"].includes(backend),
  "Backend must be one of supported types"
);

// 2. Mock player functionality
const mockPlayer = new AudioPlayer("mock");
assert.strictEqual(mockPlayer.getBackend(), "mock");
assert.strictEqual(mockPlayer.isAvailable(), true);

const tmpWav = path.join(os.tmpdir(), "alexa-test-tone.wav");
fs.writeFileSync(tmpWav, generateTone(440, 50));

const asyncResult = await mockPlayer.playFile(tmpWav);
assert.strictEqual(asyncResult, true, "Mock player async play must succeed");

const syncResult = mockPlayer.playFileSync(tmpWav);
assert.strictEqual(syncResult, true, "Mock player sync play must succeed");
console.log("✓ Mock audio playback verified");

// 3. Non-existent file safety
const missingResult = await mockPlayer.playFile("/non/existent/path.wav");
assert.strictEqual(missingResult, false, "Playing non-existent file must fail gracefully");
console.log("✓ Non-existent file safety verified");

// 4. Live player test if available (quick non-blocking or mock)
if (defaultAudioPlayer.isAvailable()) {
  console.log(`✓ Active system audio player '${backend}' is available`);
}

fs.unlinkSync(tmpWav);
console.log("=== All Audio Player Tests Passed ===");
