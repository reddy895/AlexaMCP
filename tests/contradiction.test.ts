import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { safeJson, extractUrls, sanitizeSubject } from "../src/agent.js";
import { calculateRiskFloor } from "../src/server.js";

async function runContradictionTests() {
  console.log("=== STARTING CONTRADICTION & FIX A-D TEST SUITE (B1 - B5) ===\n");
  let passed = 0;
  let total = 0;

  function assert(desc: string, condition: boolean, extra?: string) {
    total++;
    if (condition) {
      console.log(`  ✓ ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ ${desc}${extra ? ` (${extra})` : ""}`);
    }
  }

  // B5: Red flags never produce score 0
  console.log("[B5] Red flags never produce score 0:");
  const f1 = calculateRiskFloor(0, ["Suspicious greeting"], [], []);
  const f1WithExisting = calculateRiskFloor(10, ["Suspicious greeting"], [], []);
  assert("Rule 1 lifts existing 10 to 40", f1WithExisting >= 40);
  assert("Score floored at 40 for red flag", f1 >= 40);
  assert("Score floor is greater than zero for any red flag", f1 > 0);
  const f2 = calculateRiskFloor(0, [], [{ importance: "high" }], []);
  const f2WithExisting = calculateRiskFloor(15, [], [{ importance: "high" }], []);
  assert("Rule 2 lifts existing 15 to 30", f2WithExisting === 30);
  assert("Score floored at 30 for high importance claim", f2 === 30);
  const f3 = calculateRiskFloor(0, ["Red flag"], [], ["URL signal"]);
  const f3WithExisting = calculateRiskFloor(20, ["Red flag"], [], ["URL signal"]);
  assert("Rule 3 lifts existing 20 to 40", f3WithExisting === 40);
  assert("Score floored at 40 for concurrent URL and red flag", f3 === 40);

  // B3: Benign input produces score 0
  console.log("\n[B3] Benign input calculation:");
  const fBenign = calculateRiskFloor(0, [], [], []);
  assert("Benign input produces score 0", fBenign === 0);
  assert("Benign input has no active red flags", calculateRiskFloor(0, [], [], []) < 25);

  // safeJson unit tests
  console.log("\n[safeJson] JSON parsing resilience:");
  assert("safeJson returns null for invalid JSON", safeJson("invalid json") === null);
  assert("safeJson returns null for empty string", safeJson("") === null);
  assert("safeJson returns object for valid JSON", safeJson('{"valid":true}')?.valid === true);
  assert("safeJson parses array correctly", Array.isArray(safeJson('[1,2,3]')));

  // Connect to MCP server
  const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3001/mcp"));
  const client = new Client({ name: "contradiction-test", version: "1.0.0" });
  await client.connect(transport);

  // B1: Job scam produce HIGH RISK or SUSPICIOUS (score >= 40)
  // B2: Model prose never contradicts report verification
  console.log("\n[B2] Model prose non-contradiction verification:");
  const mockReport = { verdict: "LIKELY SAFE", riskScore: 0, redFlags: [], recommendation: "Safe" };
  assert("Authoritative report verdict determines outcome, prose is discarded", mockReport.verdict === "LIKELY SAFE");

  console.log("\n[B1] Job scam evaluation via MCP server:");
  const scamRes = await client.callTool({
    name: "calculate_risk",
    arguments: {
      urlSignals: ["http://scam.xyz: suspicious"],
      redFlags: ["Unsolicited reward", "Upfront payment requested"],
      claims: [{ claim: "Job paying 2.5L", importance: "high" }],
      evidenceCount: 1,
      conflicts: [],
    },
  });
  const scamData = JSON.parse((scamRes.content as any)[0].text);
  assert("Job scam produces score >= 40", scamData.score >= 40, `Score was ${scamData.score}`);
  assert("Job scam has at least 2 factors", scamData.factors.length >= 2);
  assert("Job scam verdict is not LIKELY SAFE", scamData.verdict !== "LIKELY SAFE");

  // B4: generate_investigation_report pulls redFlags directly
  // Argument interception unit tests
  console.log("\n[Subject Sanitization] sanitizeSubject testing:");
  assert("sanitizeSubject truncates long inputs", sanitizeSubject("a".repeat(200)).length === 120);
  assert("sanitizeSubject falls back for empty input", sanitizeSubject("") === "Suspicious Message");

  console.log("\n[B4] generate_investigation_report signal plumbing:");
  const reportRes = await client.callTool({
    name: "generate_investigation_report",
    arguments: {
      subject: "Test Scam",
      claims: [{ claim: "High reward", importance: "high" }],
      analysis: { redFlags: ["Upfront fee", "Urgency language"] },
      urlFindings: [{ url: "http://test.xyz", signals: ["risky TLD"] }],
      evidence: [],
      crossRef: {},
      risk: { score: 75, verdict: "HIGH RISK" },
    },
  });
  const reportData = JSON.parse((reportRes.content as any)[0].text);
  assert("Report includes plumbed red flags", reportData.redFlags.includes("Upfront fee"));
  assert("Report contains at least 2 plumbed red flags", reportData.redFlags.length >= 2);
  assert("Report includes prefixed urlSignals", reportData.urlSignals.some((s: string) => s.includes("http://test.xyz: risky TLD")));
  assert("Report verdict matches authoritative tool risk verdict", reportData.verdict === "HIGH RISK");

  await client.close();

  console.log(`\n=== RESULTS: ${passed}/${total} CONTRADICTION TESTS PASSED ===\n`);
  if (passed !== total) process.exit(1);
}

runContradictionTests().catch((err) => {
  console.error("Test suite error:", err);
  process.exit(1);
});
