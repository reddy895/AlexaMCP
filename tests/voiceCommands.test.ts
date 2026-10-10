import { handleVoiceCommand } from "../src/dialogue/voiceCommands.js";
import { classifyVoiceIntent } from "../src/dialogue/intentClassifier.js";
import assert from "node:assert";

console.log("=== Testing Voice Control Commands ===");

// 1. Mute
const c1 = classifyVoiceIntent("Mute");
const r1 = handleVoiceCommand(c1);
assert.strictEqual(r1.handled, true);
assert.strictEqual(r1.action, "mute");
assert.ok(r1.speechResponse.includes("muted"));
console.log("✓ Mute command handled");

// 2. Unmute
const c2 = classifyVoiceIntent("Unmute please");
const r2 = handleVoiceCommand(c2);
assert.strictEqual(r2.handled, true);
assert.strictEqual(r2.action, "unmute");
assert.ok(r2.speechResponse.includes("restored"));
console.log("✓ Unmute command handled");

// 3. Switch voice
const c3 = classifyVoiceIntent("Switch voice to forensics");
const r3 = handleVoiceCommand(c3);
assert.strictEqual(r3.handled, true);
assert.strictEqual(r3.action, "change_voice");
assert.strictEqual(r3.payload?.personaId, "forensics");
assert.ok(r3.speechResponse.includes("Forensics Specialist"));
console.log("✓ Voice switching command handled");

// 4. Help
const c4 = classifyVoiceIntent("Help me with commands");
const r4 = handleVoiceCommand(c4);
assert.strictEqual(r4.handled, true);
assert.strictEqual(r4.action, "help");
assert.ok(r4.speechResponse.includes("You can speak any suspicious message"));
console.log("✓ Voice help command handled");

console.log("=== All Voice Command Tests Passed ===");
