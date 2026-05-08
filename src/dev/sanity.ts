import { assertContentDefinitions, validateContentDefinitions } from "../core/content/validation";
import { createInitialGameState } from "../core/state";
import { executeAction } from "../core/actions";
import { runAllScenarios } from "./scenarios";

interface Check {
  name: string;
  ok: boolean;
  details?: string;
}

function checkManualReward(): Check {
  const gs = createInitialGameState();
  const result = executeAction(gs, "hardenSystem");
  return {
    name: "hardenSystem reward matches node catalog",
    ok: result?.rewardApplied.eq(1) ?? false,
    details: `reward=${result?.rewardApplied.toString() ?? "missing"}`,
  };
}

function checkManualReputation(): Check {
  const gs = createInitialGameState();
  const result = executeAction(gs, "hackSystem");
  return {
    name: "hackSystem reputation delta matches node catalog",
    ok: result?.reputationDelta.eq(-1) ?? false,
    details: `delta=${result?.reputationDelta.toString() ?? "missing"}`,
  };
}

function checkScenarioReachability(): Check {
  const results = runAllScenarios();
  const hasFinite = results.every((result) =>
    Object.values(result.resources).every((value) => Number.isFinite(Number(value)))
  );

  return {
    name: "manual-only scenarios produce finite resources",
    ok: hasFinite,
    details: results.map((result) => `${result.name}: money=${result.resources.money}, rep=${result.resources.reputation}`).join(" | "),
  };
}

function runSanityChecks(): Check[] {
  assertContentDefinitions();
  const content = validateContentDefinitions();

  return [
    {
      name: "content definitions valid",
      ok: content.valid,
      details: content.valid ? "ok" : content.errors.join("; "),
    },
    checkManualReward(),
    checkManualReputation(),
    checkScenarioReachability(),
  ];
}

const checks = runSanityChecks();
let failed = 0;

for (const check of checks) {
  const icon = check.ok ? "PASS" : "FAIL";
  console.log(`[sanity] ${icon} ${check.name}${check.details ? ` :: ${check.details}` : ""}`);
  if (!check.ok) failed += 1;
}

if (failed > 0) {
  console.error(`[sanity] Failed checks: ${failed}`);
  process.exit(1);
}

console.log("[sanity] All checks passed");
