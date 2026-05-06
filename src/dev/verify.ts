import Decimal from "break_eternity.js";
import { createInitialGameState } from "../core/state";
import { executeAction, getActionYield, levelUpAction } from "../core/actions";
import {
  GENERATOR_CONFIGS,
  GENERATORS,
  allocatePassiveCompute,
  allocateTimedCompute,
  getTimedActivityInputCosts,
  setTimedActivityAutoRun,
  startTimedGenerator,
  tickPassiveGenerators,
  tickTimedGenerators,
  upgradeGenerator,
} from "../core/generators";
import { getGeneratorMultiplierStack } from "../core/scaling";
import { previewSerializedState } from "../core/persistence";
import { deserializeResourceMap, serializeResourceMap } from "../core/math";
import { validateGameState, validateSerializedGameState } from "../core/validation";

type CheckStatus = "PASS" | "FAIL" | "WARN";

interface CheckResult {
  area: string;
  check: string;
  status: CheckStatus;
  details: string;
  recommendation?: string;
}

const results: CheckResult[] = [];

function addResult(
  area: string,
  check: string,
  ok: boolean,
  details: string,
  recommendation?: string,
  warn = false
): void {
  results.push({
    area,
    check,
    status: warn ? "WARN" : ok ? "PASS" : "FAIL",
    details,
    recommendation: ok && !warn ? undefined : recommendation,
  });
}

function serializeSignature(): string {
  const gs = createInitialGameState();
  executeAction(gs, "hardenComputer");
  tickPassiveGenerators(gs, 1000);
  startTimedGenerator(gs, "buildDevice");
  tickTimedGenerators(gs, 60_000);
  const serialized = previewSerializedState(gs);
  return JSON.stringify({
    ...serialized,
    timestamps: {
      createdAt: 0,
      lastSavedAt: 0,
      lastTickAt: 0,
    },
  });
}

function verifyManualActions(): void {
  const gs = createInitialGameState();
  const hack = executeAction(gs, "hackComputer");
  addResult(
    "Manual Click Actions",
    "Hack Computer updates resources",
    !!hack && hack.rewardApplied.eq(1) && hack.reputationDelta.eq(-1) && gs.resources.money.eq(1) && gs.resources.reputation.eq(-1),
    `money=${gs.resources.money.toString()}, reputation=${gs.resources.reputation.toString()}`,
    "Verify action-to-generator mapping and reputation effect application."
  );

  const gs2 = createInitialGameState();
  const harden = executeAction(gs2, "hardenComputer");
  addResult(
    "Manual Click Actions",
    "Harden Computer updates resources",
    !!harden && harden.rewardApplied.eq(1) && harden.reputationDelta.eq(1) && gs2.resources.money.eq(1) && gs2.resources.reputation.eq(1),
    `money=${gs2.resources.money.toString()}, reputation=${gs2.resources.reputation.toString()}`,
    "Check hardenDevice output and reputation settings."
  );

  const gs3 = createInitialGameState();
  const baseYield = getActionYield(gs3, "hardenComputer");
  levelUpAction(gs3, "hardenComputer");
  const level2Yield = getActionYield(gs3, "hardenComputer");
  addResult(
    "Manual Click Actions",
    "Manual level scaling increases yield",
    baseYield.eq(1) && level2Yield.eq(2),
    `yield(lv1)=${baseYield.toString()}, yield(lv2)=${level2Yield.toString()}`,
    "Review manual level scaling exponent and level offset configuration."
  );

  const serialized = previewSerializedState(gs3);
  const validSerialized = validateSerializedGameState(serialized).valid;
  const scientificLevel = serialized.generators?.levels.hardenDevice ?? "missing";
  addResult(
    "Manual Click Actions",
    "Scientific notation serialization for generator levels",
    validSerialized && /e[+-]/i.test(scientificLevel),
    `serializedLevel=${scientificLevel}`,
    "Ensure serializeDecimal is used for generator level persistence."
  );
}

function verifyPassiveGenerators(): void {
  const gs = createInitialGameState();
  gs.resources = { ...gs.resources, compute: new Decimal(10), reputation: new Decimal(500) };
  tickPassiveGenerators(gs, 1000);
  const expectedPer = new Decimal(0.1).mul(Decimal.pow(new Decimal(0.5), new Decimal(0.25)));
  const expectedTotal = expectedPer.mul(2);

  addResult(
    "Passive Generators",
    "Passive output generates crypto with shared compute",
    gs.resources.crypto.eq(expectedTotal),
    `expected=${expectedTotal.toString()}, actual=${gs.resources.crypto.toString()}`,
    "Revisit passive compute allocation and passive multiplier stack usage."
  );

  const alloc = allocatePassiveCompute(gs);
  const allocTotal = Object.values(alloc).reduce((sum, v) => sum.add(v), new Decimal(0));
  addResult(
    "Passive Generators",
    "Passive compute allocation does not exceed pool",
    allocTotal.lte(gs.resources.compute),
    `allocated=${allocTotal.toString()}, pool=${gs.resources.compute.toString()}`,
    "Clamp or normalize passive compute shares before execution."
  );

  const low = createInitialGameState();
  low.resources = { ...low.resources, compute: new Decimal(10) };
  GENERATORS.antiVirus.executePassive(low, 1000, new Decimal(10));
  const lowOut = low.resources.crypto;

  const high = createInitialGameState();
  high.resources = { ...high.resources, compute: new Decimal(10) };
  upgradeGenerator(high, "antiVirus");
  GENERATORS.antiVirus.executePassive(high, 1000, new Decimal(10));
  const highOut = high.resources.crypto;

  addResult(
    "Passive Generators",
    "Passive level scaling increases output per tick",
    highOut.gt(lowOut),
    `lv1=${lowOut.toString()}, lv2=${highOut.toString()}`,
    "Check passive levelScaling and generator level state wiring."
  );
}

function verifyTimedActivities(): void {
  const gs = createInitialGameState();
  gs.resources = { ...gs.resources, money: new Decimal(200), crypto: new Decimal(40), compute: new Decimal(30) };
  const startedA = startTimedGenerator(gs, "buildDevice");
  const startedB = startTimedGenerator(gs, "marketSkim");
  const allocation = allocateTimedCompute(gs);
  const allocTotal = Object.values(allocation).reduce((sum, v) => sum.add(v), new Decimal(0));

  addResult(
    "Time-Based Activities",
    "Concurrent timed activities start and share compute proportionally",
    startedA && startedB && allocation.buildDevice?.eq(10) && allocation.marketSkim?.eq(20) && allocTotal.eq(30),
    `buildDevice=${allocation.buildDevice?.toString() ?? "0"}, marketSkim=${allocation.marketSkim?.toString() ?? "0"}, total=${allocTotal.toString()}`,
    "Verify timed compute weighting by baselineCompute and start conditions."
  );

  const partial = tickTimedGenerators(gs, 45_000);
  const allocAfterOneFinishes = allocateTimedCompute(gs);
  addResult(
    "Time-Based Activities",
    "Compute returns to timed pool after one activity finishes",
    partial.length === 1 && allocAfterOneFinishes.buildDevice?.eq(30),
    `completed=${partial.length}, buildDeviceAfter=${allocAfterOneFinishes.buildDevice?.toString() ?? "0"}`,
    "Ensure completed timed activities are excluded from timed compute allocation."
  );

  const gsAuto = createInitialGameState();
  gsAuto.resources = { ...gsAuto.resources, money: new Decimal(10), crypto: new Decimal(5), compute: new Decimal(10) };
  const autoSet = setTimedActivityAutoRun(gsAuto, "buildDevice", true);
  const autoDone = tickTimedGenerators(gsAuto, 60_000);
  addResult(
    "Time-Based Activities",
    "Auto-run disables when resources are insufficient",
    autoSet && autoDone.length === 1 && gsAuto.generators.timedAutoRunById.buildDevice === false,
    `autoSet=${autoSet}, completions=${autoDone.length}, autoRun=${String(gsAuto.generators.timedAutoRunById.buildDevice)}`,
    "Check timed auto-run restart and disable-on-failed-restart behavior."
  );

  const gsRepHigh = createInitialGameState();
  gsRepHigh.resources = {
    ...gsRepHigh.resources,
    money: new Decimal(100),
    crypto: new Decimal(20),
    compute: new Decimal(10),
    reputation: new Decimal(100),
  };
  const gsRepLow = createInitialGameState();
  gsRepLow.resources = {
    ...gsRepLow.resources,
    money: new Decimal(100),
    crypto: new Decimal(20),
    compute: new Decimal(10),
    reputation: new Decimal(-100),
  };
  startTimedGenerator(gsRepHigh, "buildDevice");
  startTimedGenerator(gsRepLow, "buildDevice");
  const highOut = tickTimedGenerators(gsRepHigh, 60_000)[0]?.outputs.money ?? new Decimal(0);
  const lowOut = tickTimedGenerators(gsRepLow, 60_000)[0]?.outputs.money ?? new Decimal(0);
  addResult(
    "Time-Based Activities",
    "Timed output scales with reputation for path-eligible activity",
    highOut.gt(lowOut),
    `highRep=${highOut.toString()}, lowRep=${lowOut.toString()}`,
    "Review path-based reputation scaling for timed generators."
  );

  const gsCost = createInitialGameState();
  const baseCost = getTimedActivityInputCosts(gsCost, GENERATOR_CONFIGS.buildDevice).money ?? new Decimal(0);
  upgradeGenerator(gsCost, "buildDevice");
  const leveledCost = getTimedActivityInputCosts(gsCost, GENERATOR_CONFIGS.buildDevice).money ?? new Decimal(0);
  addResult(
    "Time-Based Activities",
    "Timed activity cost increases slightly per level",
    leveledCost.gt(baseCost),
    `costLv1=${baseCost.toString()}, costLv2=${leveledCost.toString()}`,
    "Adjust timed cost multiplier policy if progression pacing is too flat or too steep."
  );
}

function verifyReputationAndGating(): void {
  const gs = createInitialGameState();
  executeAction(gs, "hardenComputer");
  executeAction(gs, "hackComputer");
  addResult(
    "Reputation System",
    "Manual actions apply positive and negative reputation",
    gs.resources.reputation.eq(0),
    `reputationAfterHardenAndHack=${gs.resources.reputation.toString()}`,
    "Confirm action reputation deltas and generator reputation effects stay aligned."
  );

  const hasRepUnlocks = Object.values(GENERATOR_CONFIGS).some((cfg) => !!cfg.unlock?.minReputation || !!cfg.unlock?.maxReputation);
  addResult(
    "Reputation System",
    "Reputation gating is configured on at least one node",
    hasRepUnlocks,
    hasRepUnlocks ? "unlock thresholds present" : "no unlock thresholds present in current content",
    "Add reputation unlock thresholds to one or more generators to actively enforce gating.",
    !hasRepUnlocks
  );

  const indefiniteGuardPresent = Object.values(GENERATOR_CONFIGS).some((cfg) => cfg.maxLevel < 10 || !!cfg.unlock);
  addResult(
    "Reputation System",
    "Node limits discourage indefinite single-node farming",
    indefiniteGuardPresent,
    indefiniteGuardPresent ? "guard rails present" : "no additional anti-farming constraints detected",
    "Consider adding cooldowns, diminishing returns, or stricter unlock windows for repetitive actions.",
    !indefiniteGuardPresent
  );
}

function verifyScalingAndMultipliers(): void {
  const gs = createInitialGameState();
  gs.resources = { ...gs.resources, reputation: new Decimal(50), compute: new Decimal(10) };

  const stackManual = getGeneratorMultiplierStack(gs, GENERATOR_CONFIGS.hardenDevice, "money");
  const expectedManual = stackManual.base
    .mul(stackManual.level)
    .mul(stackManual.talentUpgrade)
    .mul(stackManual.prestige)
    .mul(stackManual.reputationCompute);
  addResult(
    "Scaling and Multipliers",
    "Multiplier stack composes multiplicatively",
    stackManual.total.eq(expectedManual),
    `stackTotal=${stackManual.total.toString()}, product=${expectedManual.toString()}`,
    "Review stack composition order if totals diverge."
  );

  const expectedIncrementalDefault = new Decimal(1.0115);
  const hasDefaultIncremental = Object.values(GENERATOR_CONFIGS).some((cfg) => new Decimal(cfg.levelScaling).eq(expectedIncrementalDefault));
  addResult(
    "Scaling and Multipliers",
    "Default 1.15% incremental multiplier exists",
    hasDefaultIncremental,
    hasDefaultIncremental ? "detected levelScaling=1.0115" : "levelScaling=1.0115 not present in current configs",
    "If 1.15% incremental growth is required, set levelScaling defaults to 1.0115 where intended.",
    !hasDefaultIncremental
  );
}

function verifyDeterminismAndSerialization(): void {
  const sigA = serializeSignature();
  const sigB = serializeSignature();
  addResult(
    "Simulation and Determinism",
    "Identical input flow yields identical serialized state",
    sigA === sigB,
    `signatureMatch=${String(sigA === sigB)}`,
    "Audit time-dependent and random inputs in headless flows for deterministic testing."
  );

  const gs = createInitialGameState();
  executeAction(gs, "hardenComputer");
  tickPassiveGenerators(gs, 1000);
  const validState = validateGameState(gs).valid;
  const serialized = previewSerializedState(gs);
  const validSerialized = validateSerializedGameState(serialized).valid;
  const restored = deserializeResourceMap(serialized.resources);
  const restoredStable = JSON.stringify(serializeResourceMap(restored)) === JSON.stringify(serialized.resources);

  addResult(
    "Persistence and Serialization",
    "Serialized payload and restored Decimal values remain valid",
    validState && validSerialized && restoredStable,
    `stateValid=${String(validState)}, serializedValid=${String(validSerialized)}, roundTripStable=${String(restoredStable)}`,
    "Investigate Decimal serialization/deserialization if round-trip divergence appears."
  );
}

function printReport(): void {
  console.log("Gray Protocol Full Verification Report");
  console.log("| Area | Check | Status | Details |");
  console.log("|---|---|---|---|");
  for (const r of results) {
    console.log(`| ${r.area} | ${r.check} | ${r.status} | ${r.details.replace(/\|/g, "/")} |`);
  }

  const failures = results.filter((r) => r.status === "FAIL");
  const warnings = results.filter((r) => r.status === "WARN");
  const passes = results.filter((r) => r.status === "PASS");
  console.log("");
  console.log(`Summary: PASS=${passes.length}, WARN=${warnings.length}, FAIL=${failures.length}`);

  if (failures.length === 0 && warnings.length === 0) {
    console.log("All verification checks passed.");
    return;
  }

  console.log("");
  console.log("Recommendations:");
  for (const r of [...failures, ...warnings]) {
    if (r.recommendation) {
      console.log(`- ${r.area} / ${r.check}: ${r.recommendation}`);
    }
  }
}

function runVerification(): void {
  verifyManualActions();
  verifyPassiveGenerators();
  verifyTimedActivities();
  verifyReputationAndGating();
  verifyScalingAndMultipliers();
  verifyDeterminismAndSerialization();
  printReport();
}

runVerification();
