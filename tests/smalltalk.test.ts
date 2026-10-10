import { handleSmalltalk } from "../src/dialogue/smalltalk.js";
import assert from "node:assert";

console.log("=== Testing Conversational Smalltalk Handler ===");

// 1. Greeting
const g = handleSmalltalk("Hello Detective");
assert.strictEqual(g.handled, true);
assert.ok(g.speechResponse.includes("Digital Detective"));
console.log("✓ Greeting response verified");

// 2. Identity
const id = handleSmalltalk("Who are you and what can you do?");
assert.strictEqual(id.handled, true);
assert.ok(id.speechResponse.includes("autonomous scam detection agent"));
console.log("✓ Identity and capabilities response verified");

// 3. Security knowledge: SSRF
const ssrf = handleSmalltalk("What is SSRF?");
assert.strictEqual(ssrf.handled, true);
assert.ok(ssrf.speechResponse.includes("Server Side Request Forgery"));
console.log("✓ Security educational explanation verified");

// 4. Unhandled suspicious text
const unhandled = handleSmalltalk("Urgent: your account is locked click http://bad.xyz");
assert.strictEqual(unhandled.handled, false);
console.log("✓ Non-smalltalk input delegated to investigation loop");

console.log("=== All Smalltalk Tests Passed ===");
