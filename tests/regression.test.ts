import { readFileSync } from "node:fs";
import path from "node:path";
import {
  extractClaims,
  analyzeMessage,
  inspectUrl,
  searchEvidence,
  crossReference,
  calculateRisk,
  generateInvestigationReport,
} from "../src/server.js";
import { extractUrls } from "../src/util.js";

async function runRegressionTests() {
  console.log("=== RUNNING REGRESSION TESTS (01 - 06) ===\n");

  const files = [
    { file: "01-job-scam.txt", expectedVerdicts: ["HIGH RISK"] },
    { file: "02-phishing.txt", expectedVerdicts: ["HIGH RISK"] },
    { file: "03-lottery.txt", expectedVerdicts: ["HIGH RISK"] },
    { file: "04-crypto-soft.txt", expectedVerdicts: ["SUSPICIOUS"] },
    { file: "05-legitimate.txt", expectedVerdicts: ["LIKELY SAFE"] },
    { file: "06-url-only.txt", expectedVerdicts: ["SUSPICIOUS", "HIGH RISK"] },
  ];

  let allPassed = true;

  for (const item of files) {
    const filePath = path.resolve("test-inputs", item.file);
    const content = readFileSync(filePath, "utf-8").trim();

    const urls = extractUrls(content);
    const urlFindings: any[] = [];
    for (const url of urls) {
      const res = await inspectUrl(url);
      urlFindings.push(res);
    }

    const claims = extractClaims(content);
    const analysis = analyzeMessage(content);

    const evidenceResults: any[] = [];
    if (claims.length > 0) {
      const query = claims[0].claim.slice(0, 50);
      const ev = await searchEvidence(query);
      evidenceResults.push(ev);
    }

    const crossRef = crossReference(claims, evidenceResults);
    const urlSignals = urlFindings.flatMap((u) => u.signals);

    const risk = calculateRisk({
      claims,
      redFlags: analysis.redFlags,
      urlSignals,
      conflicts: crossRef.conflicts,
      evidenceCount: evidenceResults.flatMap((e) => e.results ?? []).length,
    });

    const report = generateInvestigationReport({
      subject: content.slice(0, 50),
      claims,
      analysis,
      urlFindings,
      evidence: evidenceResults,
      crossRef,
      risk,
    });

    const matchesExpected = item.expectedVerdicts.includes(report.verdict);
    console.log(
      `[${item.file}] Verdict: ${report.verdict} (Score: ${report.riskScore}) — ${
        matchesExpected ? "✓ PASSED" : "✗ FAILED"
      }`
    );

    if (!matchesExpected) {
      allPassed = false;
      console.error(`  Expected one of: ${item.expectedVerdicts.join(", ")}, got: ${report.verdict}`);
      console.error(`  Red flags: ${JSON.stringify(analysis.redFlags)}`);
      console.error(`  URL signals: ${JSON.stringify(urlSignals)}`);
    }
  }

  console.log(`\n=== REGRESSION RESULT: ${allPassed ? "ALL PASSED" : "FAILED"} ===`);
  if (!allPassed) process.exit(1);
}

runRegressionTests().catch((err) => {
  console.error("Regression test error:", err);
  process.exit(1);
});
