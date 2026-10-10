import { classifyVoiceIntent } from "../src/dialogue/intentClassifier.js";
import assert from "node:assert";

console.log("=== Testing Voice Intent Classifier ===");

// 1. Exit intent
const exitRes = classifyVoiceIntent("Goodbye Detective");
assert.strictEqual(exitRes.intent, "EXIT");
console.log("✓ Exit intent classified");

// 2. Repeat intent
const repeatRes = classifyVoiceIntent("Can you repeat that please?");
assert.strictEqual(repeatRes.intent, "REPEAT");
console.log("✓ Repeat intent classified");

// 3. Control intent with voice entity extraction
const controlRes = classifyVoiceIntent("Switch voice to detective");
assert.strictEqual(controlRes.intent, "CONTROL");
assert.strictEqual(controlRes.entities.targetVoice, "detective");
console.log("✓ Control intent and voice entity classified");

// 4. Smalltalk intent
const smalltalkRes = classifyVoiceIntent("Who are you and what can you do?");
assert.strictEqual(smalltalkRes.intent, "SMALLTALK");
console.log("✓ Smalltalk intent classified");

// 5. Follow-up Explain intent
const explainRes = classifyVoiceIntent("Why is it high risk?", true);
assert.strictEqual(explainRes.intent, "EXPLAIN");
console.log("✓ Explain follow-up intent classified");

// 6. Investigate intent
const investigateRes = classifyVoiceIntent("You won 10,000 dollars. Visit http://claim-prize.xyz to redeem.");
assert.strictEqual(investigateRes.intent, "INVESTIGATE");
console.log("✓ Investigate intent classified");

console.log("=== All Intent Classifier Tests Passed ===");
