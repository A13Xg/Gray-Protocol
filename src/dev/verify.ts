import { createInitialGameState } from "../core/state";
import { executeAction, getActionYield, levelUpAction } from "../core/actions";
import { previewSerializedState } from "../core/persistence";
import { validateGameState, validateSerializedGameState } from "../core/validation";

type CheckStatus = "PASS" | "FAIL";

interface CheckResult {
  area: string;
  check: string;
  status: CheckStatus;
  details: string;
  recommendation?: string;
}

const results: CheckResult[] = [];

function addResult(area: string, check: string, ok: boolean, details: string, recommendation?: string): void {
  results.push({
    area,
    check,
    status: ok ? "PASS" : "FAIL",
    details,
    recommendation: ok ? undefined : recommendation,
  });
}

function verifyManualActions(): void {
  const hackState = createInitialGameState();
  const hack = executeAction(hackState, "hackComputer");
  addResult(
    "Manual Actions",
    "Hack System updates resources",
    !!hack && hack.rewardApplied.eq(1) && hack.reputationDelta.eq(-1) && hackState.resources.money.eq(1) && hackState.resources.reputation.eq(-1),
    `money=${hackState.resources.money.toString()}, reputation=${hackState.resources.reputation.toString()}`,
    "Check nodeCatalog.json for hackSystem outputResources and reputationEffect."
  );

  const hardenState = createInitialGameState();
  const harden = executeAction(hardenState, "hardenComputer");
  addResult(
    "Manual Actions",
    "Harden System updates resources",
    !!harden && harden.rewardApplied.eq(1) && harden.reputationDelta.eq(1) && hardenState.resources.money.eq(1) && hardenState.resources.reputation.eq(1),
    `money=${hardenState.resources.money.toString()}, reputation=${hardenState.resources.reputation.toString()}`,
    "Check nodeCatalog.json for hardenSystem outputResources and reputationEffect."
  );

  const levelState = createInitialGameState();
  const baseYield = getActionYield(levelState, "hardenSystem");
  const levelUpWorked = levelUpAction(levelState, "hardenSystem");
  const postYield = getActionYield(levelState, "hardenSystem");
  addResult(
    "Manual Actions",
    "Clean state keeps manual actions fixed-level",
    baseYield.eq(1) && !levelUpWorked && postYield.eq(1),
    `yieldBefore=${baseYield.toString()}, levelUpWorked=${String(levelUpWorked)}, yieldAfter=${postYield.toString()}`,
    "Only reintroduce level progression after the new node upgrade system is designed."
  );
}

function verifySerialization(): void {
  const gs = createInitialGameState();
  executeAction(gs, "hardenSystem");
  const serialized = previewSerializedState(gs);
  const serializedValid = validateSerializedGameState(serialized).valid;
  const stateValid = validateGameState(gs).valid;

  addResult(
    "Persistence",
    "Serialized manual-only state validates",
    serializedValid && stateValid,
    `serializedValid=${String(serializedValid)}, stateValid=${String(stateValid)}`,
    "Check validation.ts and persistence.ts if the simplified state shape drifts."
  );
}

verifyManualActions();
verifySerialization();

let failures = 0;
for (const result of results) {
  console.log(`[verify] ${result.status} ${result.area} :: ${result.check} :: ${result.details}`);
  if (result.status === "FAIL") {
    failures += 1;
    if (result.recommendation) {
      console.log(`[verify] recommendation :: ${result.recommendation}`);
    }
  }
}

if (failures > 0) {
  console.error(`[verify] Failed checks: ${failures}`);
  process.exit(1);
}

console.log("[verify] All checks passed");
