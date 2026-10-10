import { app } from "../src/server.js";
import assert from "node:assert";
import http from "node:http";

console.log("=== Testing Web Voice API Endpoints ===");

const server = http.createServer(app);

await new Promise<void>((resolve) => {
  server.listen(0, () => resolve());
});

const addr = server.address() as any;
const baseUrl = `http://127.0.0.1:${addr.port}`;

try {
  // 1. GET /api/voice/status
  const statusRes = await fetch(`${baseUrl}/api/voice/status`);
  assert.strictEqual(statusRes.status, 200);
  const statusJson = await statusRes.json();
  assert.strictEqual(statusJson.ok, true);
  assert.ok(Array.isArray(statusJson.tts.personas));
  console.log("✓ GET /api/voice/status verified");

  // 2. POST /api/voice/intent
  const intentRes = await fetch(`${baseUrl}/api/voice/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello Detective" }),
  });
  assert.strictEqual(intentRes.status, 200);
  const intentJson = await intentRes.json();
  assert.strictEqual(intentJson.classification.intent, "SMALLTALK");
  console.log("✓ POST /api/voice/intent verified");

  // 3. POST /api/voice/briefing
  const briefingRes = await fetch(`${baseUrl}/api/voice/briefing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      verdict: "HIGH RISK",
      riskScore: 90,
      redFlags: ["credential demand"],
      recommendation: "Never share passwords.",
    }),
  });
  assert.strictEqual(briefingRes.status, 200);
  const briefingJson = await briefingRes.json();
  assert.ok(briefingJson.spokenText.includes("HIGH RISK"));
  console.log("✓ POST /api/voice/briefing verified");

  // 4. GET /api/voice/earcon/wake
  const earconRes = await fetch(`${baseUrl}/api/voice/earcon/wake`);
  assert.strictEqual(earconRes.status, 200);
  assert.strictEqual(earconRes.headers.get("content-type"), "audio/wav");
  const audioBuffer = await earconRes.arrayBuffer();
  assert.ok(audioBuffer.byteLength > 44);
  console.log("✓ GET /api/voice/earcon/:type audio stream verified");
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log("=== All Web Voice API Tests Passed ===");
